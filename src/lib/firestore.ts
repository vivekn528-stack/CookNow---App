import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  writeBatch,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getFirestoreDb,
  ensureFirebaseInitialized,
  getFirebaseAuth,
} from './firebase';
import {
  Profile,
  Address,
  Cook,
  MenuItem,
  Order,
  OrderItem,
  Review,
  CookVerificationRequest,
  PartnerApplication,
  DeliveryPartner,
  MealPlan,
  CustomerSubscription,
  Promotion,
  Complaint,
  OperatingExpense,
  PlatformSettings,
  OrderStatus,
  VerificationStatus,
} from '../types';

export interface FirestoreOperationResult<T> {
  data: T | null;
  error: string | null;
  fromLiveBackend: boolean;
}

async function getDb(): Promise<Firestore> {
  await ensureFirebaseInitialized();
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Cloud Firestore is not initialized or configured.');
  }
  return db;
}

export const firestoreService = {
  // =========================================================================
  // Health & Connectivity Test
  // =========================================================================
  async testConnection(): Promise<{
    connected: boolean;
    message: string;
    details?: any;
    collectionsFound?: string[];
  }> {
    try {
      const db = await getDb();
      // Probe platform_settings or cooks collection
      const settingsRef = doc(db, 'platform_settings', 'global');
      const snap = await getDoc(settingsRef);

      const cooksSnap = await getDocs(query(collection(db, 'cooks'), limit(1)));

      return {
        connected: true,
        message: 'Successfully connected to live Cloud Firestore database!',
        details: {
          hasGlobalSettings: snap.exists(),
          sampleCookCount: cooksSnap.size,
        },
        collectionsFound: ['platform_settings', 'cooks', 'menu_items', 'orders'],
      };
    } catch (err: any) {
      return {
        connected: false,
        message: `Firestore connection check failed: ${err.message || String(err)}`,
        details: err,
      };
    }
  },

  // =========================================================================
  // Platform Settings
  // =========================================================================
  async fetchPlatformSettings(): Promise<FirestoreOperationResult<PlatformSettings>> {
    try {
      const db = await getDb();
      const snap = await getDoc(doc(db, 'platform_settings', 'global'));
      if (snap.exists()) {
        return { data: snap.data() as PlatformSettings, error: null, fromLiveBackend: true };
      }
      return { data: null, error: 'Settings not initialized', fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async savePlatformSettings(settings: PlatformSettings): Promise<FirestoreOperationResult<PlatformSettings>> {
    try {
      const db = await getDb();
      await setDoc(doc(db, 'platform_settings', 'global'), {
        ...settings,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return { data: settings, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  // =========================================================================
  // User Profiles & Addresses
  // =========================================================================
  async fetchUserProfile(userId: string): Promise<FirestoreOperationResult<Profile>> {
    try {
      const db = await getDb();
      const snap = await getDoc(doc(db, 'users', userId));
      if (!snap.exists()) {
        return { data: null, error: 'User profile not found', fromLiveBackend: true };
      }
      return { data: snap.data() as Profile, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async saveUserProfile(profile: Profile): Promise<FirestoreOperationResult<Profile>> {
    try {
      const db = await getDb();
      // Ensure role cannot be self-elevated beyond 'customer' if creating profile
      const auth = getFirebaseAuth();
      const isSuperAdmin = auth?.currentUser?.email === 'vivekn528@gmail.com';

      const payload: Partial<Profile> = {
        ...profile,
        id: profile.id,
      };

      if (!isSuperAdmin && profile.role !== 'customer') {
        payload.role = 'customer';
      }

      await setDoc(doc(db, 'users', profile.id), payload, { merge: true });
      return { data: profile, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async fetchAddresses(userId: string): Promise<FirestoreOperationResult<Address[]>> {
    try {
      const db = await getDb();
      const snap = await getDocs(collection(db, 'users', userId, 'addresses'));
      const addresses: Address[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: addresses, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async saveAddress(userId: string, address: Address): Promise<FirestoreOperationResult<Address>> {
    try {
      const db = await getDb();
      const addressId = address.id || `addr-${Date.now()}`;
      await setDoc(doc(db, 'users', userId, 'addresses', addressId), {
        ...address,
        id: addressId,
        userId,
      });
      return { data: { ...address, id: addressId, userId }, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async deleteAddress(userId: string, addressId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      await deleteDoc(doc(db, 'users', userId, 'addresses', addressId));
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // =========================================================================
  // Cooks / Kitchens
  // =========================================================================
  async fetchCooks(options?: {
    includeUnverified?: boolean;
    cookUserId?: string;
  }): Promise<FirestoreOperationResult<Cook[]>> {
    try {
      const db = await getDb();
      const auth = getFirebaseAuth();
      const currentUser = auth?.currentUser;
      const isSuperAdmin = Boolean(
        currentUser &&
        currentUser.email?.toLowerCase().trim() === 'vivekn528@gmail.com' &&
        currentUser.emailVerified
      );

      let q;
      if (options?.includeUnverified && isSuperAdmin) {
        // Super Admin: Authorized access to all cooks, including unverified/pending
        q = query(collection(db, 'cooks'));
      } else if (options?.cookUserId && currentUser && options.cookUserId === currentUser.uid) {
        // Authenticated Cook: Access to their own linked kitchen by real auth UID (never synthetic ID)
        q = query(collection(db, 'cooks'), where('userId', '==', currentUser.uid));
      } else {
        // Public customer query: Strictly verified cooks (compatible with deployed security rules)
        q = query(collection(db, 'cooks'), where('isVerified', '==', true));
      }

      const snap = await getDocs(q);
      const cooks: Cook[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      // Sort in memory by createdAt descending to avoid requiring composite Firestore indexes
      cooks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return { data: cooks, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async fetchCookById(cookId: string): Promise<FirestoreOperationResult<Cook>> {
    try {
      const db = await getDb();
      const snap = await getDoc(doc(db, 'cooks', cookId));
      if (!snap.exists()) {
        return { data: null, error: 'Cook kitchen not found', fromLiveBackend: true };
      }
      return { data: { id: snap.id, ...(snap.data() as any) }, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async insertCook(cook: Cook): Promise<FirestoreOperationResult<Cook>> {
    try {
      const db = await getDb();
      const cookId = cook.id || `cook-${Date.now()}`;
      const payload: Cook = {
        ...cook,
        id: cookId,
        isVerified: cook.isVerified ?? false,
        verificationStatus: cook.verificationStatus || 'pending',
        rating: Number(cook.rating) || 5.0,
        reviewCount: Number(cook.reviewCount) || 0,
        createdAt: cook.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'cooks', cookId), payload, { merge: true });
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async updateCook(cookId: string, updates: Partial<Cook>): Promise<FirestoreOperationResult<Cook>> {
    try {
      const db = await getDb();
      const ref = doc(db, 'cooks', cookId);
      await updateDoc(ref, updates as any);
      const updatedSnap = await getDoc(ref);
      return {
        data: { id: updatedSnap.id, ...(updatedSnap.data() as any) } as Cook,
        error: null,
        fromLiveBackend: true,
      };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  // =========================================================================
  // Menu Items
  // =========================================================================
  async fetchMenuItems(cookId?: string): Promise<FirestoreOperationResult<MenuItem[]>> {
    try {
      const db = await getDb();
      let q = query(collection(db, 'menu_items'), orderBy('createdAt', 'desc'));
      if (cookId) {
        q = query(collection(db, 'menu_items'), where('cookId', '==', cookId));
      }
      const snap = await getDocs(q);
      const items: MenuItem[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: items, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async saveMenuItem(item: MenuItem): Promise<FirestoreOperationResult<MenuItem>> {
    try {
      const db = await getDb();
      const auth = getFirebaseAuth();
      const currentUserId = auth?.currentUser?.uid || '';
      const itemId = item.id || `item-${Date.now()}`;

      // Associate item with cook's authenticated user ID for security rules validation
      const payload: any = {
        ...item,
        id: itemId,
        cookUserId: currentUserId,
        price: Number(item.price),
        prepTimeMinutes: Number(item.prepTimeMinutes) || 20,
        createdAt: item.createdAt || new Date().toISOString(),
      };

      await setDoc(doc(db, 'menu_items', itemId), payload, { merge: true });
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async deleteMenuItem(itemId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      await deleteDoc(doc(db, 'menu_items', itemId));
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // =========================================================================
  // Orders & Transactions
  // =========================================================================
  async fetchOrders(filter?: {
    customerId?: string;
    cookId?: string;
    deliveryPartnerId?: string;
  }): Promise<FirestoreOperationResult<Order[]>> {
    try {
      const db = await getDb();
      const auth = getFirebaseAuth();
      const currentUser = auth?.currentUser;
      const isSuperAdmin = Boolean(
        currentUser &&
        currentUser.email?.toLowerCase().trim() === 'vivekn528@gmail.com' &&
        currentUser.emailVerified
      );

      let q;
      if (isSuperAdmin) {
        if (filter?.customerId) {
          q = query(collection(db, 'orders'), where('customerId', '==', filter.customerId));
        } else if (filter?.cookId) {
          q = query(collection(db, 'orders'), where('cookId', '==', filter.cookId));
        } else if (filter?.deliveryPartnerId) {
          q = query(collection(db, 'orders'), where('deliveryPartnerId', '==', filter.deliveryPartnerId));
        } else {
          q = query(collection(db, 'orders'));
        }
      } else if (currentUser) {
        // Authenticated Customer: strictly query orders where customerId == currentUser.uid
        // Rules: resource.data.customerId == request.auth.uid
        q = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid));
      } else {
        // Anonymous visitor: no orders in Firestore
        return { data: [], error: null, fromLiveBackend: false };
      }

      const snap = await getDocs(q);
      const orders: Order[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return { data: orders, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async fetchOrderById(orderId: string): Promise<FirestoreOperationResult<Order>> {
    try {
      const db = await getDb();
      const snap = await getDoc(doc(db, 'orders', orderId));
      if (!snap.exists()) {
        return { data: null, error: 'Order not found', fromLiveBackend: true };
      }
      return { data: { id: snap.id, ...(snap.data() as any) }, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  /**
   * Disarmed Legacy Order Creation
   *
   * Direct client-side Web SDK order creation is strictly disabled under the Phase 4.5A.2
   * security architecture. All orders must be placed through the server-authoritative
   * Cloud Function (placeOrder) using placeCustomerOrder in order-service.ts.
   */
  async createOrderWithTransaction(
    _order: Order,
    _promoCode?: string
  ): Promise<FirestoreOperationResult<Order>> {
    return {
      data: null,
      error:
        'Client-side direct order creation is disabled for financial security. Orders must be submitted via the server-authoritative Cloud Function (placeOrder). Cart items and checkout state are safely preserved.',
      fromLiveBackend: false,
    };
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    reason?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      const orderRef = doc(db, 'orders', orderId);
      const snap = await getDoc(orderRef);
      if (!snap.exists()) {
        return { success: false, error: 'Order not found.' };
      }

      const existing = snap.data() as Order;
      const events = existing.events || [];
      events.push({
        status,
        timestamp: new Date().toISOString(),
        note: reason || `Status changed to ${status}`,
      });

      const updates: any = {
        status,
        events,
        updatedAt: new Date().toISOString(),
      };

      if (status === 'cancelled') {
        updates.cancellationReason = reason || 'Cancelled';
      }
      // CRITICAL: Delivering an order does NOT automatically collect COD cash.
      // Doorstep cash handover requires explicit reconciliation at Nalapani Hub.

      await updateDoc(orderRef, updates);
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateOrderDeliveryStatus(
    orderId: string,
    deliveryStatus: 'assigned' | 'picked_up' | 'out_for_delivery' | 'delivered',
    riderId: string,
    riderName?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      const orderRef = doc(db, 'orders', orderId);
      const updates: any = {
        deliveryStatus,
        deliveryPartnerId: riderId,
        updatedAt: new Date().toISOString(),
      };
      if (riderName) updates.deliveryPartnerName = riderName;
      if (deliveryStatus === 'delivered') {
        updates.status = 'delivered';
      }

      await updateDoc(orderRef, updates);
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async confirmCODRemittance(
    orderId: string,
    reconciledBy = 'Vivek Singh Negi'
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      const orderRef = doc(db, 'orders', orderId);
      const snap = await getDoc(orderRef);
      const existingEvents = snap.exists() ? snap.data()?.events || [] : [];
      const nowIso = new Date().toISOString();
      const updates: any = {
        paymentStatus: 'paid',
        reconciledAt: nowIso,
        reconciledBy,
        updatedAt: nowIso,
        events: [
          ...existingEvents,
          {
            status: snap.exists() ? snap.data()?.status || 'delivered' : 'delivered',
            timestamp: nowIso,
            note: `COD cash remittance verified and reconciled at Nalapani Hub by ${reconciledBy}`,
          },
        ],
      };
      await updateDoc(orderRef, updates);
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async reverseOperatingExpense(
    expenseId: string,
    reason = 'Owner financial correction',
    reversedBy = 'Vivek Singh Negi'
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      const expRef = doc(db, 'operating_expenses', expenseId);
      const nowIso = new Date().toISOString();
      await updateDoc(expRef, {
        isReversed: true,
        reversedAt: nowIso,
        reversedBy,
        reversalReason: reason,
      });
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Real-time listener for single active order tracking
  subscribeToOrder(
    orderId: string,
    onUpdate: (order: Order) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    let unsub: Unsubscribe = () => {};
    getDb().then((db) => {
      unsub = onSnapshot(
        doc(db, 'orders', orderId),
        (snap) => {
          if (snap.exists()) {
            onUpdate({ id: snap.id, ...(snap.data() as any) });
          }
        },
        onError
      );
    });
    return () => unsub();
  },

  // =========================================================================
  // Reviews with Delivered Order Verification
  // =========================================================================
  async fetchReviews(cookId?: string): Promise<FirestoreOperationResult<Review[]>> {
    try {
      const db = await getDb();
      let q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
      if (cookId) {
        q = query(collection(db, 'reviews'), where('cookId', '==', cookId));
      }
      const snap = await getDocs(q);
      const reviews: Review[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: reviews, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  /**
   * Submits a customer review only after verifying that the referenced order
   * exists and has reached 'delivered' status. Updates the cook's rating atomically.
   */
  async insertReviewWithOrderVerification(
    review: Review
  ): Promise<FirestoreOperationResult<Review>> {
    try {
      const db = await getDb();
      const auth = getFirebaseAuth();
      const currentUserId = auth?.currentUser?.uid || review.customerId;

      // 1. Verify delivered order requirement
      const orderRef = doc(db, 'orders', review.orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        return { data: null, error: 'Referenced order does not exist.', fromLiveBackend: false };
      }

      const orderData = orderSnap.data() as Order;
      if (orderData.customerId !== currentUserId) {
        return { data: null, error: 'You can only review orders placed by your account.', fromLiveBackend: false };
      }

      if (orderData.status !== 'delivered') {
        return {
          data: null,
          error: `Order must be marked 'delivered' before reviewing (Current order status: ${orderData.status}).`,
          fromLiveBackend: false,
        };
      }

      const reviewId = review.id || `rev-${Date.now()}`;
      const reviewPayload: Review = {
        ...review,
        id: reviewId,
        customerId: currentUserId,
        rating: Math.max(1, Math.min(5, Math.round(Number(review.rating)))),
        createdAt: review.createdAt || new Date().toISOString(),
      };

      // 2. Atomic review insertion and cook rating update
      await runTransaction(db, async (transaction) => {
        const cookRef = doc(db, 'cooks', review.cookId);
        const cookSnap = await transaction.get(cookRef);

        transaction.set(doc(db, 'reviews', reviewId), reviewPayload);

        if (cookSnap.exists()) {
          const cook = cookSnap.data() as Cook;
          const currentCount = Number(cook.reviewCount) || 0;
          const currentRating = Number(cook.rating) || 5.0;

          const newCount = currentCount + 1;
          const newRating = Number(
            ((currentRating * currentCount + reviewPayload.rating) / newCount).toFixed(1)
          );

          transaction.update(cookRef, {
            rating: newRating,
            reviewCount: newCount,
          });
        }
      });

      return { data: reviewPayload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  // =========================================================================
  // Partner Applications & Cook Verification
  // =========================================================================
  async fetchPartnerApplications(): Promise<FirestoreOperationResult<PartnerApplication[]>> {
    try {
      const db = await getDb();
      const q = query(collection(db, 'partner_applications'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      const apps: PartnerApplication[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: apps, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async insertPartnerApplication(app: PartnerApplication): Promise<FirestoreOperationResult<PartnerApplication>> {
    try {
      const db = await getDb();
      const appId = app.id || `app-${Date.now()}`;
      const payload: PartnerApplication = {
        ...app,
        id: appId,
        status: 'pending',
        submittedAt: app.submittedAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'partner_applications', appId), payload);
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async updatePartnerApplicationStatus(
    id: string,
    status: VerificationStatus,
    reviewerReason?: string,
    reviewerName?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      await updateDoc(doc(db, 'partner_applications', id), {
        status,
        reviewerReason: reviewerReason || null,
        reviewedBy: reviewerName || 'Super Admin',
        reviewedAt: new Date().toISOString(),
      });
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async fetchCookVerificationRequests(): Promise<FirestoreOperationResult<CookVerificationRequest[]>> {
    try {
      const db = await getDb();
      const snap = await getDocs(collection(db, 'cook_verification_requests'));
      const requests: CookVerificationRequest[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: requests, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async insertCookVerificationRequest(
    req: CookVerificationRequest
  ): Promise<FirestoreOperationResult<CookVerificationRequest>> {
    try {
      const db = await getDb();
      const id = req.id || `cvr-${Date.now()}`;
      const payload: CookVerificationRequest = {
        ...req,
        id,
        status: 'pending',
        submittedAt: req.submittedAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'cook_verification_requests', id), payload);
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  // =========================================================================
  // Delivery Partners
  // =========================================================================
  async fetchDeliveryPartners(): Promise<FirestoreOperationResult<DeliveryPartner[]>> {
    try {
      const db = await getDb();
      const snap = await getDocs(collection(db, 'delivery_partners'));
      const partners: DeliveryPartner[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: partners, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async insertDeliveryPartner(partner: DeliveryPartner): Promise<FirestoreOperationResult<DeliveryPartner>> {
    try {
      const db = await getDb();
      const id = partner.id || `dp-${Date.now()}`;
      const payload: DeliveryPartner = {
        ...partner,
        id,
        status: 'pending',
        earningsBalance: 0,
        rating: 5.0,
        totalDeliveries: 0,
        isAvailable: partner.isAvailable ?? true,
        createdAt: partner.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'delivery_partners', id), payload);
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async updateDeliveryPartnerStatus(
    id: string,
    status: VerificationStatus,
    reviewerNotes?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      await updateDoc(doc(db, 'delivery_partners', id), {
        status,
        reviewerNotes: reviewerNotes || null,
      });
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateDeliveryPartnerAvailability(
    id: string,
    isAvailable: boolean
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      await updateDoc(doc(db, 'delivery_partners', id), { isAvailable });
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // =========================================================================
  // Meal Plans & Subscriptions
  // =========================================================================
  async fetchMealPlans(): Promise<FirestoreOperationResult<MealPlan[]>> {
    try {
      const db = await getDb();
      const snap = await getDocs(collection(db, 'meal_plans'));
      const plans: MealPlan[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: plans, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async saveMealPlan(plan: MealPlan): Promise<FirestoreOperationResult<MealPlan>> {
    try {
      const db = await getDb();
      const id = plan.id || `plan-${Date.now()}`;
      const payload: MealPlan = {
        ...plan,
        id,
        createdAt: plan.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'meal_plans', id), payload, { merge: true });
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async deleteMealPlan(planId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      await deleteDoc(doc(db, 'meal_plans', planId));
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async fetchSubscriptions(customerId?: string): Promise<FirestoreOperationResult<CustomerSubscription[]>> {
    try {
      const db = await getDb();
      let q = query(collection(db, 'customer_subscriptions'), orderBy('createdAt', 'desc'));
      if (customerId) {
        q = query(collection(db, 'customer_subscriptions'), where('customerId', '==', customerId));
      }
      const snap = await getDocs(q);
      const subs: CustomerSubscription[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: subs, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async insertSubscription(
    sub: CustomerSubscription
  ): Promise<FirestoreOperationResult<CustomerSubscription>> {
    try {
      const db = await getDb();
      const id = sub.id || `sub-${Date.now()}`;
      const payload: CustomerSubscription = {
        ...sub,
        id,
        mealsDelivered: 0,
        status: 'active',
        createdAt: sub.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'customer_subscriptions', id), payload);
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async updateSubscriptionPauseDates(
    subId: string,
    pauseDates: string[],
    pausesRemaining: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      await updateDoc(doc(db, 'customer_subscriptions', subId), {
        pauseDates,
        pausesRemaining,
      });
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // =========================================================================
  // Promotions & Discounts
  // =========================================================================
  async fetchPromotions(activeOnly = false): Promise<FirestoreOperationResult<Promotion[]>> {
    try {
      const db = await getDb();
      let q = query(collection(db, 'promotions'));
      if (activeOnly) {
        q = query(collection(db, 'promotions'), where('isActive', '==', true));
      }
      const snap = await getDocs(q);
      const promos: Promotion[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: promos, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async savePromotion(promo: Promotion): Promise<FirestoreOperationResult<Promotion>> {
    try {
      const db = await getDb();
      const code = promo.code.trim().toUpperCase();
      const id = promo.id || code;
      const payload: Promotion = {
        ...promo,
        id,
        code,
        currentUsageCount: promo.currentUsageCount || 0,
        spentBudget: promo.spentBudget || 0,
      };
      await setDoc(doc(db, 'promotions', id), payload, { merge: true });
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  // =========================================================================
  // Complaints
  // =========================================================================
  async fetchComplaints(): Promise<FirestoreOperationResult<Complaint[]>> {
    try {
      const db = await getDb();
      const snap = await getDocs(query(collection(db, 'complaints'), orderBy('createdAt', 'desc')));
      const complaints: Complaint[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: complaints, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async insertComplaint(complaint: Complaint): Promise<FirestoreOperationResult<Complaint>> {
    try {
      const db = await getDb();
      const id = complaint.id || `cmp-${Date.now()}`;
      const payload: Complaint = {
        ...complaint,
        id,
        status: 'open',
        refundIssued: 0,
        createdAt: complaint.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'complaints', id), payload);
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async updateComplaintStatus(
    complaintId: string,
    status: Complaint['status'],
    resolutionNotes?: string,
    refundIssued?: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const db = await getDb();
      const updates: any = {
        status,
        resolutionNotes: resolutionNotes || null,
        resolvedAt: ['resolved', 'dismissed'].includes(status) ? new Date().toISOString() : null,
      };
      if (typeof refundIssued === 'number') updates.refundIssued = refundIssued;

      await updateDoc(doc(db, 'complaints', complaintId), updates);
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // =========================================================================
  // Operating Expenses
  // =========================================================================
  async fetchOperatingExpenses(): Promise<FirestoreOperationResult<OperatingExpense[]>> {
    try {
      const db = await getDb();
      const snap = await getDocs(query(collection(db, 'operating_expenses'), orderBy('date', 'desc')));
      const expenses: OperatingExpense[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      return { data: expenses, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async insertOperatingExpense(
    expense: OperatingExpense
  ): Promise<FirestoreOperationResult<OperatingExpense>> {
    try {
      const db = await getDb();
      const id = expense.id || `exp-${Date.now()}`;
      const payload: OperatingExpense = {
        ...expense,
        id,
        amount: Number(expense.amount),
      };
      await setDoc(doc(db, 'operating_expenses', id), payload);
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  // =========================================================================
  // Settlements (Cook & Rider Payouts)
  // =========================================================================
  async fetchSettlements(): Promise<FirestoreOperationResult<any[]>> {
    try {
      const db = await getDb();
      const snap = await getDocs(query(collection(db, 'settlements'), orderBy('settledAt', 'desc')));
      const settlements = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { data: settlements, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },

  async recordSettlement(settlement: {
    id?: string;
    targetType: 'cook' | 'rider';
    targetId: string;
    targetName: string;
    amount: number;
    referenceNumber: string;
    settledBy?: string;
  }): Promise<FirestoreOperationResult<any>> {
    try {
      const db = await getDb();
      const id = settlement.id || `settle-${Date.now()}`;
      const payload = {
        ...settlement,
        id,
        settledAt: new Date().toISOString(),
        settledBy: settlement.settledBy || 'Vivek Singh Negi (Founder & Owner)',
      };
      await setDoc(doc(db, 'settlements', id), payload);
      return { data: payload, error: null, fromLiveBackend: true };
    } catch (err: any) {
      return { data: null, error: err.message, fromLiveBackend: false };
    }
  },
};
