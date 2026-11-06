import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import type {
  PlaceOrderRequest,
  CanonicalOrder,
  OrderItem,
  Promotion,
  PlatformSettings,
} from './types.js';

// Native Firebase Admin initialization (zero private keys, ambient project ADC)
const app = getApps().length > 0 ? getApps()[0] : initializeApp();

// Exact custom Firestore database ID for CookNow project cooknow-9444c
export const FIRESTORE_DATABASE_ID =
  'ai-studio-cooknowhomestyle-7c8332e7-39bc-4862-8a92-262d83edb331';

const db = getFirestore(app, FIRESTORE_DATABASE_ID);

/**
 * Server-Authoritative Order Placement Function
 *
 * Implements 100% server-side validation:
 * - Customer identity derived exclusively from verified Firebase Auth token
 * - Menu items, availability, and prices retrieved directly from Firestore
 * - Cook kitchen status and acceptance checked on server
 * - Promotion code, expiry, usage limit, budget limit, and per-customer limit validated atomically
 * - Strict read-before-write transactional discipline
 * - Idempotency protection against network retries
 * - Exclusive COD handling; UPI online payment rejection
 */
export const placeOrder = onCall(
  {
    region: 'asia-south1',
    invoker: 'public',
    serviceAccount: 'cooknow-order-backend@cooknow-9444c.iam.gserviceaccount.com',
  },
  async (request): Promise<{ success: boolean; order: CanonicalOrder }> => {
    // 1. Mandatory Customer Authentication
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError(
        'unauthenticated',
        'Authentication required. Please sign in with your Google account.'
      );
    }

    const customerUid = request.auth.uid;
    const customerEmail = request.auth.token.email || '';
    const payload = request.data as PlaceOrderRequest;

    // 2. Payload Structure Validations
    if (!payload || !payload.cookId || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid order request. Missing cook selection or meal items.'
      );
    }

    const { fullName, phone, addressLine, locality } = payload.deliveryAddress || {};
    if (!fullName?.trim() || !phone?.trim() || !addressLine?.trim() || !locality?.trim()) {
      throw new HttpsError(
        'invalid-argument',
        'Incomplete delivery address. Full name, phone, address, and locality are required.'
      );
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new HttpsError(
        'invalid-argument',
        'Please enter a valid 10-digit Indian mobile number.'
      );
    }

    // 3. Payment Method Validation (COD only; UPI safely blocked until genuine gateway)
    if (payload.paymentMethod !== 'cod') {
      throw new HttpsError(
        'failed-precondition',
        'Online UPI payment gateway is in sandbox pilot mode. Please select "Cash / Pay on Delivery" to proceed.'
      );
    }

    // 4. Validate & Aggregate Item Quantities (positive integers, deduplicated)
    const aggregatedQuantities = new Map<string, number>();
    for (const item of payload.items) {
      if (!item.menuItemId || typeof item.menuItemId !== 'string') {
        throw new HttpsError('invalid-argument', 'Invalid meal item identifier.');
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new HttpsError(
          'invalid-argument',
          `Invalid quantity (${item.quantity}) for meal item ${item.menuItemId}. Must be a positive integer.`
        );
      }
      const current = aggregatedQuantities.get(item.menuItemId) || 0;
      aggregatedQuantities.set(item.menuItemId, current + item.quantity);
    }

    // 5. Idempotency Key Validation (Mandatory for safe server-side ordering)
    const idempotencyKey = payload.idempotencyKey?.trim();
    if (!idempotencyKey) {
      throw new HttpsError(
        'invalid-argument',
        'idempotencyKey is required to safely place and verify your order.'
      );
    }

    const uniqueItemIds = Array.from(aggregatedQuantities.keys());
    const cleanPromoCode = payload.promoCode?.trim().toUpperCase();

    // Normalized delivery address components for tamper-evident signature
    const normalizedDeliveryAddress = {
      fullName: (fullName || '').trim().toLowerCase(),
      phone: cleanPhone,
      addressLine: (addressLine || '').trim().toLowerCase(),
      locality: (locality || '').trim().toLowerCase(),
      landmark: (payload.deliveryAddress?.landmark || '').trim().toLowerCase(),
      hostelOrPgName: (payload.deliveryAddress?.hostelOrPgName || '').trim().toLowerCase(),
      postalCode: (payload.deliveryAddress?.postalCode || '').trim().toLowerCase(),
    };

    // Canonical payload signature for tamper-evident idempotency validation
    const payloadSignature = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          customerUid,
          cookId: payload.cookId,
          items: uniqueItemIds.sort().map((id) => ({ id, qty: aggregatedQuantities.get(id) })),
          promoCode: cleanPromoCode || '',
          deliveryAddress: normalizedDeliveryAddress,
        })
      )
      .digest('hex');

    // 6. ATOMIC FIRESTORE TRANSACTION
    // Strict requirement: Every document read MUST occur before ANY document write.
    const resultOrder = await db.runTransaction(async (transaction) => {
      // -----------------------------------------------------------------------
      // PHASE 1: PRE-READ ALL DOCUMENTS
      // -----------------------------------------------------------------------

      // 1.1 Check Idempotency Key (to prevent duplicate orders from client retries)
      const idempotencyDocRef = db.collection('order_idempotency').doc(idempotencyKey);
      const idempotencySnap = await transaction.get(idempotencyDocRef);
      if (idempotencySnap.exists) {
        const existingData = idempotencySnap.data();

        // Security Guard: Prevent cross-customer idempotency key hijacking
        if (existingData?.customerId && existingData.customerId !== customerUid) {
          throw new HttpsError(
            'permission-denied',
            'Cross-customer idempotency key reuse is strictly prohibited.'
          );
        }

        // Integrity Guard: Prevent payload tampering with existing idempotency key
        if (existingData?.payloadSignature && existingData.payloadSignature !== payloadSignature) {
          throw new HttpsError(
            'already-exists',
            'The provided idempotency key was previously submitted with a different order payload.'
          );
        }

        if (existingData?.order) {
          // Already safely created in a previous attempt, return existing canonical order
          return existingData.order as CanonicalOrder;
        }
      }

      // 1.2 Read Platform Settings (Global fee structure)
      const settingsRef = db.collection('platform_settings').doc('global');
      const settingsSnap = await transaction.get(settingsRef);
      const settings: PlatformSettings = settingsSnap.exists
        ? (settingsSnap.data() as PlatformSettings)
        : {
            freeDeliveryThreshold: 250,
            standardDeliveryFee: 25,
            platformServiceFee: 5,
            packagingFee: 10,
            commissionRatePercent: 15,
          };

      // 1.3 Read Cook Document
      const cookRef = db.collection('cooks').doc(payload.cookId);
      const cookSnap = await transaction.get(cookRef);
      if (!cookSnap.exists) {
        throw new HttpsError('not-found', 'Selected home cook kitchen was not found.');
      }
      const cookData = cookSnap.data();
      if (!cookData?.isVerified) {
        throw new HttpsError(
          'failed-precondition',
          `Kitchen "${cookData?.kitchenName || payload.cookId}" is not verified to accept orders.`
        );
      }
      if (!cookData?.isAcceptingOrders) {
        throw new HttpsError(
          'failed-precondition',
          `Kitchen "${cookData?.kitchenName}" is currently not accepting orders. Please try another local kitchen.`
        );
      }

      // 1.4 Read All Ordered Menu Item Documents
      const menuItemRefs = uniqueItemIds.map((id) => db.collection('menu_items').doc(id));
      const menuItemSnaps = await Promise.all(menuItemRefs.map((ref) => transaction.get(ref)));

      // 1.5 Read Promotion & Redemption Documents (if promo requested)
      let promoDocRef = null;
      let promoData: Promotion | null = null;
      let customerRedemptionRef = null;
      let customerRedemptionSnap = null;

      if (cleanPromoCode) {
        const promoQuery = db
          .collection('promotions')
          .where('code', '==', cleanPromoCode)
          .limit(1);
        const promoQuerySnap = await transaction.get(promoQuery);

        if (!promoQuerySnap.empty) {
          const promoDoc = promoQuerySnap.docs[0];
          promoDocRef = promoDoc.ref;
          promoData = promoDoc.data() as Promotion;

          // Read customer redemption tracking document
          customerRedemptionRef = db
            .collection('coupon_redemptions')
            .doc(`${promoDoc.id}_${customerUid}`);
          customerRedemptionSnap = await transaction.get(customerRedemptionRef);
        }
      }

      // -----------------------------------------------------------------------
      // PHASE 2: VALIDATION & FINANCIAL RECALCULATION
      // -----------------------------------------------------------------------
      let itemsSubtotal = 0;
      const orderItems: OrderItem[] = [];
      const generatedOrderId = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      for (let i = 0; i < uniqueItemIds.length; i++) {
        const itemId = uniqueItemIds[i];
        const snap = menuItemSnaps[i];
        const quantity = aggregatedQuantities.get(itemId)!;

        if (!snap.exists) {
          throw new HttpsError('not-found', `Meal item ${itemId} was not found in the catalog.`);
        }

        const item = snap.data();
        if (!item?.isAvailable) {
          throw new HttpsError(
            'failed-precondition',
            `Meal dish "${item?.name || itemId}" is currently sold out or unavailable.`
          );
        }

        if (item.cookId !== payload.cookId) {
          throw new HttpsError(
            'invalid-argument',
            `Dish "${item.name}" does not belong to kitchen "${cookData.kitchenName}". Multi-kitchen orders are not supported.`
          );
        }

        // Canonical Server-Side Price (Student Mini: ₹49, Regular: ₹69, Full: ₹79, etc.)
        const canonicalPrice = Number(item.price);
        if (isNaN(canonicalPrice) || canonicalPrice <= 0) {
          throw new HttpsError('internal', `Corrupt catalog price for dish ${item.name}.`);
        }

        const itemSubtotal = canonicalPrice * quantity;
        itemsSubtotal += itemSubtotal;

        orderItems.push({
          id: `oi-${crypto.randomBytes(4).toString('hex')}`,
          orderId: generatedOrderId,
          menuItemId: itemId,
          itemName: item.name || 'Homestyle Dish',
          unitPrice: canonicalPrice,
          quantity,
          subtotal: itemSubtotal,
          dietaryType: item.dietaryType || 'pure_veg',
        });
      }

      // 2.1 Calculate Delivery, Platform, and Packaging Fees
      const freeDeliveryThreshold = settings.freeDeliveryThreshold ?? 250;
      const standardDeliveryFee = settings.standardDeliveryFee ?? 25;
      const platformFee = settings.platformServiceFee ?? 5;
      const packagingFee = settings.packagingFee ?? 10;
      const deliveryFee = itemsSubtotal >= freeDeliveryThreshold ? 0 : standardDeliveryFee;

      // 2.2 Server-Side Coupon Settlement & Validation
      let verifiedDiscount = 0;
      let appliedPromoCode: string | undefined = undefined;
      let appliedFundingSource: 'cooknow_funded' | 'restaurant_funded' | 'shared_funded' | undefined = undefined;
      const now = new Date();

      if (cleanPromoCode) {
        if (!promoData || !promoDocRef) {
          throw new HttpsError('not-found', `Coupon code "${cleanPromoCode}" is invalid.`);
        }

        if (!promoData.isActive) {
          throw new HttpsError('failed-precondition', `Coupon "${cleanPromoCode}" is no longer active.`);
        }

        // Check start and end dates against server time in Asia/Kolkata (+05:30) timezone
        // Date-only string (e.g. "2026-12-31") must span through 23:59:59.999 in IST
        let startDate: Date;
        if (promoData.startDate.includes('T')) {
          startDate = new Date(promoData.startDate);
        } else {
          startDate = new Date(`${promoData.startDate.trim()}T00:00:00.000+05:30`);
        }

        let endDate: Date;
        if (promoData.endDate.includes('T')) {
          endDate = new Date(promoData.endDate);
        } else {
          endDate = new Date(`${promoData.endDate.trim()}T23:59:59.999+05:30`);
        }

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new HttpsError('internal', `Corrupt validity period on coupon "${cleanPromoCode}".`);
        }

        if (now < startDate) {
          throw new HttpsError('failed-precondition', `Coupon "${cleanPromoCode}" is not yet valid.`);
        }
        if (now > endDate) {
          throw new HttpsError('failed-precondition', `Coupon "${cleanPromoCode}" has expired.`);
        }

        // Check minimum order value
        if (itemsSubtotal < promoData.minOrderValue) {
          throw new HttpsError(
            'failed-precondition',
            `Coupon "${cleanPromoCode}" requires a minimum order subtotal of ₹${promoData.minOrderValue}. Your subtotal is ₹${itemsSubtotal}.`
          );
        }

        // Check global usage limit
        if (promoData.currentUsageCount >= promoData.usageLimit) {
          throw new HttpsError(
            'failed-precondition',
            `Coupon "${cleanPromoCode}" has reached its maximum global redemption limit.`
          );
        }

        // Check global budget limit
        if (promoData.spentBudget >= promoData.budgetLimit) {
          throw new HttpsError(
            'failed-precondition',
            `Promotional budget for coupon "${cleanPromoCode}" has been exhausted.`
          );
        }

        // Check per-customer redemption limit
        const customerRedemptionsCount = customerRedemptionSnap?.exists
          ? Number(customerRedemptionSnap.data()?.count || 0)
          : 0;

        if (customerRedemptionsCount >= (promoData.perCustomerLimit || 1)) {
          throw new HttpsError(
            'failed-precondition',
            `You have already reached the redemption limit (${promoData.perCustomerLimit || 1}) for coupon "${cleanPromoCode}".`
          );
        }

        // Calculate discount with maximum cap enforcement
        if (promoData.discountType === 'percentage') {
          const rawDiscount = Math.round((itemsSubtotal * promoData.discountValue) / 100);
          verifiedDiscount = Math.min(rawDiscount, promoData.maxDiscountCap || rawDiscount);
        } else {
          verifiedDiscount = Math.min(promoData.discountValue, itemsSubtotal);
        }

        // Check remaining budget does not exceed cap
        const remainingBudget = Math.max(0, promoData.budgetLimit - promoData.spentBudget);
        verifiedDiscount = Math.min(verifiedDiscount, remainingBudget);

        appliedPromoCode = promoData.code;
        appliedFundingSource = promoData.fundingSource;
      }

      // 2.3 Calculate Final Payable Amount & Commissions
      const finalPayable = Math.max(
        0,
        itemsSubtotal + deliveryFee + platformFee + packagingFee - verifiedDiscount
      );

      const commissionRate = settings.commissionRatePercent ?? 15;
      const platformCommission = Math.round((itemsSubtotal * commissionRate) / 100);
      let partnerDiscountShare = 0;
      if (appliedFundingSource === 'restaurant_funded') {
        partnerDiscountShare = verifiedDiscount;
      } else if (appliedFundingSource === 'shared_funded') {
        partnerDiscountShare = Math.round(verifiedDiscount / 2);
      }
      const cookEarnings = Math.max(0, itemsSubtotal - platformCommission - partnerDiscountShare);

      // 2.4 Construct Canonical Order Object
      const isoNow = now.toISOString();
      const canonicalOrder: CanonicalOrder = {
        id: generatedOrderId,
        customerId: customerUid,
        customerName: fullName.trim(),
        customerPhone: cleanPhone,
        cookId: payload.cookId,
        cookUserId: cookData.userId || undefined,
        kitchenName: cookData.kitchenName || 'Local Home Kitchen',
        status: 'pending',
        items: orderItems,
        itemsSubtotal,
        deliveryFee,
        platformFee,
        packagingFee,
        discount: verifiedDiscount,
        discountCode: appliedPromoCode,
        discountFunding: appliedFundingSource,
        finalPayableAmount: finalPayable,
        platformCommission,
        cookEarnings,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        deliveryStatus: 'unassigned',
        deliveryAddress: {
          fullName: fullName.trim(),
          phone: cleanPhone,
          locality: locality.trim(),
          addressLine: addressLine.trim(),
          landmark: payload.deliveryAddress.landmark?.trim() || undefined,
          hostelOrPgName: payload.deliveryAddress.hostelOrPgName?.trim() || undefined,
        },
        deliveryInstructions: payload.deliveryInstructions?.trim() || undefined,
        idempotencyKey,
        events: [
          {
            status: 'pending',
            timestamp: isoNow,
            note: 'Order validated and placed by verified customer via Cash on Delivery.',
          },
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
      };

      // -----------------------------------------------------------------------
      // PHASE 3: ATOMIC WRITES
      // -----------------------------------------------------------------------

      // 3.1 Create Order Document
      const orderRef = db.collection('orders').doc(generatedOrderId);
      transaction.set(orderRef, canonicalOrder);

      // 3.2 Atomically Increment Coupon Usage & Spent Budget
      if (promoDocRef && verifiedDiscount > 0) {
        transaction.update(promoDocRef, {
          currentUsageCount: FieldValue.increment(1),
          spentBudget: FieldValue.increment(verifiedDiscount),
        });

        // 3.3 Record Per-Customer Coupon Redemption
        if (customerRedemptionRef) {
          transaction.set(
            customerRedemptionRef,
            {
              promoId: promoData!.id,
              promoCode: cleanPromoCode,
              customerId: customerUid,
              customerEmail,
              count: FieldValue.increment(1),
              lastRedeemedOrderId: generatedOrderId,
              lastRedeemedAt: isoNow,
              totalDiscountReceived: FieldValue.increment(verifiedDiscount),
            },
            { merge: true }
          );
        }
      }

      // 3.4 Save Idempotency Record
      if (idempotencyDocRef) {
        transaction.set(idempotencyDocRef, {
          idempotencyKey,
          customerId: customerUid,
          payloadSignature,
          orderId: generatedOrderId,
          createdAt: isoNow,
          order: canonicalOrder,
        });
      }

      return canonicalOrder;
    });

    return {
      success: true,
      order: resultOrder,
    };
  }
);
