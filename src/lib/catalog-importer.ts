/**
 * CookNow Stage 1 Migration: Public Business & Catalog Data Importer
 * Authenticated Super Admin Web Client Import (Option A)
 *
 * Scope (Exactly 22 Documents):
 * - 1 platform_settings/global
 * - 5 cooks
 * - 10 menu_items
 * - 3 meal_plans
 * - 3 promotions
 *
 * Safety & Security Rules:
 * - Requires active Firebase Google Sign-In with verified email 'vivekn528@gmail.com'.
 * - Atomic create-only protection using Firestore transactions (`runTransaction`).
 * - A document that already exists is NEVER overwritten.
 * - Deterministic document IDs preserving canonical relationships.
 * - Zero bank details, zero Aadhaar/identity proofs, zero internal verification notes.
 * - Zero migratedBy email leakage into public documents.
 * - Preserves legacy IDs as `legacyCookUserId` metadata; does not invent fake Firebase UIDs.
 * - Verifies every document immediately after write by reading it back.
 * - Produces a structured audit log.
 */

import { doc, getDoc, runTransaction, Firestore } from 'firebase/firestore';
import { getFirestoreDb, getFirebaseAuth, ensureFirebaseInitialized } from './firebase';
import {
  INITIAL_COOKS,
  INITIAL_MENU_ITEMS,
  INITIAL_MEAL_PLANS,
  INITIAL_PROMOTIONS,
  INITIAL_SETTINGS,
} from './storage';
import { Cook, MenuItem, MealPlan, Promotion, PlatformSettings } from '../types';

export interface PlannedDocumentSummary {
  collection: string;
  id: string;
  name: string;
  category: string;
}

export interface Stage1ImportResult {
  success: boolean;
  timestamp: string;
  migratedBy: string;
  totalPlanned: number;
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  created: Array<{ collection: string; id: string; name: string }>;
  skipped: Array<{ collection: string; id: string; reason: string }>;
  errors: Array<{ collection: string; id: string; error: string }>;
  verifiedDocsCount: number;
}

export const STAGE1_PLANNED_DOCUMENTS: PlannedDocumentSummary[] = [
  // 1. Platform Settings (1)
  {
    collection: 'platform_settings',
    id: 'global',
    name: 'Platform Settings (Standard Fees & Rates)',
    category: 'Settings',
  },
  // 2. Cooks (5)
  ...INITIAL_COOKS.map((c) => ({
    collection: 'cooks',
    id: c.id,
    name: `${c.kitchenName} (${c.ownerName})`,
    category: 'Cook Kitchen',
  })),
  // 3. Menu Items (10)
  ...INITIAL_MENU_ITEMS.map((m) => ({
    collection: 'menu_items',
    id: m.id,
    name: `${m.name} (₹${m.price})`,
    category: 'Menu Item',
  })),
  // 4. Meal Plans (3)
  ...INITIAL_MEAL_PLANS.map((mp) => ({
    collection: 'meal_plans',
    id: mp.id,
    name: `${mp.title} (₹${mp.pricePerMonth}/mo)`,
    category: 'Meal Plan',
  })),
  // 5. Promotions (3)
  ...INITIAL_PROMOTIONS.map((p) => ({
    collection: 'promotions',
    id: p.id,
    name: `Coupon ${p.code} (${p.name})`,
    category: 'Promotion',
  })),
];

/**
 * Atomic Create-Only Document Processor
 * Uses Firestore transactions to guarantee that if a document exists,
 * it is NEVER overwritten, eliminating check-then-set race conditions.
 */
async function atomicCreateDoc(
  db: Firestore,
  collectionName: string,
  docId: string,
  docData: any,
  displayName: string,
  result: Stage1ImportResult
): Promise<'CREATED' | 'SKIPPED'> {
  const docRef = doc(db, collectionName, docId);

  const outcome = await runTransaction(db, async (tx) => {
    const snap = await tx.get(docRef);
    if (snap.exists()) {
      return 'SKIPPED';
    }
    tx.set(docRef, docData);
    return 'CREATED';
  });

  if (outcome === 'SKIPPED') {
    result.skipped.push({
      collection: collectionName,
      id: docId,
      reason: `Document ${collectionName}/${docId} already exists. Overwrite strictly prevented.`,
    });
    result.skippedCount++;
    return 'SKIPPED';
  }

  // Post-write readback verification
  const verifySnap = await getDoc(docRef);
  if (!verifySnap.exists()) {
    throw new Error(`Post-write readback verification failed for ${collectionName}/${docId}.`);
  }

  result.created.push({
    collection: collectionName,
    id: docId,
    name: displayName,
  });
  result.createdCount++;
  result.verifiedDocsCount++;
  return 'CREATED';
}

export async function executeStage1PublicImport(
  onProgress?: (current: number, total: number, message: string) => void
): Promise<Stage1ImportResult> {
  await ensureFirebaseInitialized();
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Cloud Firestore is not initialized or configured.');
  }

  // 1. Strict Super Admin Authentication Verification
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    throw new Error(
      'Authentication required: Please sign in with your Google account first.'
    );
  }

  const userEmail = (currentUser.email || '').toLowerCase().trim();
  const isEmailVerified = Boolean(currentUser.emailVerified);

  if (userEmail !== 'vivekn528@gmail.com') {
    throw new Error(
      `Unauthorized: Authenticated account (${userEmail}) is not the authorized Super Admin (vivekn528@gmail.com). Access denied.`
    );
  }

  if (!isEmailVerified) {
    throw new Error(
      'Unauthorized: Google email is not marked as verified. Super Admin requires a verified Google account.'
    );
  }

  const timestamp = new Date().toISOString();
  const result: Stage1ImportResult = {
    success: false,
    timestamp,
    migratedBy: userEmail,
    totalPlanned: STAGE1_PLANNED_DOCUMENTS.length, // 22
    createdCount: 0,
    skippedCount: 0,
    errorCount: 0,
    created: [],
    skipped: [],
    errors: [],
    verifiedDocsCount: 0,
  };

  const cooksMap = new Map<string, Cook>(INITIAL_COOKS.map((c) => [c.id, c]));
  let processed = 0;
  const total = STAGE1_PLANNED_DOCUMENTS.length;

  const notify = (msg: string) => {
    processed++;
    if (onProgress) onProgress(processed, total, msg);
  };

  try {
    // -----------------------------------------------------------------------
    // STEP 1: Platform Settings (1 doc: platform_settings/global)
    // -----------------------------------------------------------------------
    notify('Checking & atomically creating platform_settings/global...');
    const cleanSettings: PlatformSettings & { legacyAlias: string } = {
      commissionRatePercent: INITIAL_SETTINGS.commissionRatePercent,
      standardDeliveryFee: INITIAL_SETTINGS.standardDeliveryFee,
      freeDeliveryThreshold: INITIAL_SETTINGS.freeDeliveryThreshold,
      platformServiceFee: INITIAL_SETTINGS.platformServiceFee,
      packagingFee: INITIAL_SETTINGS.packagingFee,
      launchLocality: INITIAL_SETTINGS.launchLocality,
      supportPhone: INITIAL_SETTINGS.supportPhone,
      supportEmail: INITIAL_SETTINGS.supportEmail,
      legacyAlias: 'general',
    };

    await atomicCreateDoc(
      db,
      'platform_settings',
      'global',
      cleanSettings,
      'Platform Settings (global)',
      result
    );

    // -----------------------------------------------------------------------
    // STEP 2: Cooks (5 docs)
    // -----------------------------------------------------------------------
    for (const c of INITIAL_COOKS) {
      notify(`Checking & atomically creating cooks/${c.id}...`);

      // Cook Identity Handling:
      // user-cook-1 is a legacy mock ID. Do NOT pretend it is a real Firebase UID.
      // Store strictly as metadata: legacyCookUserId. Real userId is left unassigned until Google Sign-in.
      // Cleaned: Removed verificationNotes and migratedBy email.
      // Retained: Public business contact phone, FSSAI registration, operating hours, capacity.
      const cleanCook = {
        id: c.id,
        userId: '', // Left unassigned until cook signs in with real Google Account
        legacyCookUserId: c.userId, // Preserved strictly as historical metadata
        accountLinkingStatus: 'pending_cook_signin',
        kitchenName: c.kitchenName,
        ownerName: c.ownerName,
        phone: '', // Private mobile numbers excluded from public catalog unless explicitly authorized
        bio: c.bio,
        address: c.address,
        locality: c.locality,
        city: c.city,
        state: c.state,
        fssaiNumber: c.fssaiNumber,
        isVerified: c.isVerified, // Cook-5 retains false
        verificationStatus: c.verificationStatus, // Cook-5 retains 'pending'
        partnerType: c.partnerType,
        avatarUrl: c.avatarUrl || '',
        bannerUrl: c.bannerUrl || '',
        rating: c.rating,
        reviewCount: c.reviewCount,
        specialty: c.specialty,
        deliveryTimeMin: c.deliveryTimeMin,
        deliveryTimeMax: c.deliveryTimeMax,
        isAcceptingOrders: c.isAcceptingOrders, // Cook-5 retains false
        operatingHours: c.operatingHours,
        dailyCapacity: c.dailyCapacity,
        createdAt: c.createdAt || timestamp,
      };

      await atomicCreateDoc(db, 'cooks', c.id, cleanCook, c.kitchenName, result);
    }

    // -----------------------------------------------------------------------
    // STEP 3: Menu Items (10 docs)
    // -----------------------------------------------------------------------
    for (const m of INITIAL_MENU_ITEMS) {
      notify(`Checking & atomically creating menu_items/${m.id}...`);

      const cook = cooksMap.get(m.cookId);
      if (!cook) {
        throw new Error(`Menu item ${m.id} references invalid cookId: ${m.cookId}`);
      }

      const cleanMenuItem = {
        id: m.id,
        cookId: m.cookId,
        legacyCookUserId: cook.userId, // Preserved strictly as historical metadata
        cookUserId: '', // Unassigned until cook links account
        name: m.name,
        description: m.description,
        price: m.price,
        category: m.category,
        dietaryType: m.dietaryType,
        prepTimeMinutes: m.prepTimeMinutes,
        isAvailable: m.isAvailable,
        imageUrl: m.imageUrl || '',
        portionSize: m.portionSize || '',
        spiceLevel: m.spiceLevel || 'Medium',
        ...(m.isStudentSpecial ? { isStudentSpecial: true, studentMealTier: m.studentMealTier } : {}),
        createdAt: m.createdAt || timestamp,
      };

      await atomicCreateDoc(db, 'menu_items', m.id, cleanMenuItem, m.name, result);
    }

    // -----------------------------------------------------------------------
    // STEP 4: Meal Plans (3 docs)
    // -----------------------------------------------------------------------
    for (const mp of INITIAL_MEAL_PLANS) {
      notify(`Checking & atomically creating meal_plans/${mp.id}...`);

      const cleanMealPlan = {
        id: mp.id,
        providerId: mp.providerId,
        providerName: mp.providerName,
        title: mp.title,
        description: mp.description,
        planType: mp.planType,
        pricePerMonth: mp.pricePerMonth,
        mealsCount: mp.mealsCount,
        durationDays: mp.durationDays,
        mealSchedule: mp.mealSchedule,
        serviceArea: mp.serviceArea,
        isAvailable: mp.isAvailable,
        sampleMenuHighlights: mp.sampleMenuHighlights,
        pausesAllowed: mp.pausesAllowed,
        createdAt: mp.createdAt || timestamp,
      };

      await atomicCreateDoc(db, 'meal_plans', mp.id, cleanMealPlan, mp.title, result);
    }

    // -----------------------------------------------------------------------
    // STEP 5: Promotions (3 docs)
    // -----------------------------------------------------------------------
    for (const promo of INITIAL_PROMOTIONS) {
      notify(`Checking & atomically creating promotions/${promo.id}...`);

      const cleanPromotion = {
        id: promo.id,
        code: promo.code.toUpperCase(),
        name: promo.name,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        minOrderValue: promo.minOrderValue,
        maxDiscountCap: promo.maxDiscountCap,
        startDate: promo.startDate,
        endDate: promo.endDate,
        eligibleCategory: promo.eligibleCategory || '',
        fundingSource: promo.fundingSource,
        ...(promo.partnerSharePercent ? { partnerSharePercent: promo.partnerSharePercent } : {}),
        usageLimit: promo.usageLimit,
        currentUsageCount: promo.currentUsageCount,
        perCustomerLimit: promo.perCustomerLimit,
        budgetLimit: promo.budgetLimit,
        spentBudget: promo.spentBudget,
        isActive: promo.isActive,
        createdAt: timestamp,
      };

      await atomicCreateDoc(
        db,
        'promotions',
        promo.id,
        cleanPromotion,
        `${promo.code} - ${promo.name}`,
        result
      );
    }

    result.success = true;
    try {
      localStorage.setItem('cooknow_stage1_migration_audit', JSON.stringify(result, null, 2));
    } catch {
      // Non-fatal
    }

    return result;
  } catch (err: any) {
    result.success = false;
    result.errorCount++;
    result.errors.push({
      collection: 'stage1',
      id: 'fatal',
      error: err.message || String(err),
    });
    try {
      localStorage.setItem('cooknow_stage1_migration_audit', JSON.stringify(result, null, 2));
    } catch {
      // Non-fatal
    }
    throw err;
  }
}
