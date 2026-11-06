/**
 * CookNow Stage 1 Migration: Public Business & Catalog Data ONLY
 *
 * Scope:
 * 1. cooks (5 records)
 * 2. menu_items (10 records)
 * 3. meal_plans (3 records)
 * 4. promotions (3 records)
 * 5. platform_settings/global (1 record)
 *
 * Excluded from Stage 1:
 * - Customers, profiles, addresses, orders, reviews, subscriptions,
 *   delivery partners, complaints, partner applications, operating expenses.
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const CONFIG_PATH = path.resolve(process.cwd(), 'firebase-applet-config.json');

interface Stage1AuditEntry {
  entityType: string;
  targetCollection: string;
  targetId: string;
  status: 'CREATED' | 'SKIPPED_EXISTS' | 'FAILED' | 'PENDING_DRY_RUN';
  verifiedAfterWrite: boolean;
  fieldsCount: number;
  error?: string;
}

async function runStage1Migration() {
  const isExecute = process.argv.includes('--execute');
  const timestamp = new Date().toISOString();

  console.log('====================================================');
  console.log('COOKNOW STAGE 1: PUBLIC BUSINESS DATA MIGRATION');
  console.log(`Execution Mode: ${isExecute ? 'LIVE WRITES' : 'DRY-RUN (SIMULATION)'}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log('====================================================\n');

  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('firebase-applet-config.json not found!');
  }
  const appletConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  const localBackupPath = path.join(BACKUP_DIR, 'localstorage-pilot-backup.json');
  if (!fs.existsSync(localBackupPath)) {
    throw new Error('localstorage-pilot-backup.json not found in /backups!');
  }
  const localData = JSON.parse(fs.readFileSync(localBackupPath, 'utf8'));

  let adminApp;
  if (getApps().length === 0) {
    adminApp = initializeApp({
      projectId: appletConfig.projectId,
    });
  } else {
    adminApp = getApps()[0];
  }

  const db = getFirestore(adminApp, appletConfig.firestoreDatabaseId);

  const stage1Audit: {
    metadata: {
      stage: string;
      timestamp: string;
      mode: string;
      projectId: string;
      databaseId: string;
    };
    created: Stage1AuditEntry[];
    skipped: Stage1AuditEntry[];
    errors: Stage1AuditEntry[];
    actualFirestoreCounts: Record<string, number>;
  } = {
    metadata: {
      stage: 'Phase 4.3A - Public Business Data Only',
      timestamp,
      mode: isExecute ? 'LIVE' : 'DRY_RUN',
      projectId: appletConfig.projectId,
      databaseId: appletConfig.firestoreDatabaseId,
    },
    created: [],
    skipped: [],
    errors: [],
    actualFirestoreCounts: {
      cooks: 0,
      menu_items: 0,
      meal_plans: 0,
      promotions: 0,
      platform_settings: 0,
    },
  };

  const cooksMap = new Map<string, any>(localData.cooks.map((c: any) => [c.id, c]));

  // Document Processor
  async function processDoc(
    collectionName: string,
    docId: string,
    docData: any,
    entityType: string
  ): Promise<boolean> {
    console.log(`[Stage 1] Processing ${collectionName}/${docId}...`);
    const docRef = db.collection(collectionName).doc(docId);

    // 1. Conflict Check: verify if document already exists
    let exists = false;
    try {
      const snap = await docRef.get();
      exists = snap.exists;
    } catch (readErr: any) {
      console.error(`[Stage 1 Conflict Check Error] ${collectionName}/${docId}:`, readErr.message);
      stage1Audit.errors.push({
        entityType,
        targetCollection: collectionName,
        targetId: docId,
        status: 'FAILED',
        verifiedAfterWrite: false,
        fieldsCount: Object.keys(docData).length,
        error: readErr.message,
      });
      return false;
    }

    if (exists) {
      console.warn(`[Stage 1] Document ${collectionName}/${docId} already exists. Skipping.`);
      stage1Audit.skipped.push({
        entityType,
        targetCollection: collectionName,
        targetId: docId,
        status: 'SKIPPED_EXISTS',
        verifiedAfterWrite: true,
        fieldsCount: Object.keys(docData).length,
      });
      return true;
    }

    if (!isExecute) {
      console.log(`[DRY-RUN] Would create ${collectionName}/${docId}`);
      stage1Audit.created.push({
        entityType,
        targetCollection: collectionName,
        targetId: docId,
        status: 'PENDING_DRY_RUN',
        verifiedAfterWrite: true,
        fieldsCount: Object.keys(docData).length,
      });
      return true;
    }

    // 2. Live Write via Admin SDK
    try {
      await docRef.create(docData);
      console.log(`[Stage 1 Write Success] Created ${collectionName}/${docId}`);

      // 3. Post-write verification
      const verifySnap = await docRef.get();
      if (!verifySnap.exists) {
        throw new Error(`Post-write verification failed: document ${collectionName}/${docId} not found.`);
      }

      stage1Audit.created.push({
        entityType,
        targetCollection: collectionName,
        targetId: docId,
        status: 'CREATED',
        verifiedAfterWrite: true,
        fieldsCount: Object.keys(docData).length,
      });
      return true;
    } catch (writeErr: any) {
      console.error(`[Stage 1 Write Failed] ${collectionName}/${docId}:`, writeErr.message);
      stage1Audit.errors.push({
        entityType,
        targetCollection: collectionName,
        targetId: docId,
        status: 'FAILED',
        verifiedAfterWrite: false,
        fieldsCount: Object.keys(docData).length,
        error: writeErr.message,
      });
      return false;
    }
  }

  // 1. Platform Settings (1 document: global)
  const settingsData = {
    ...localData.platformSettings,
    legacyAlias: 'general',
    migratedAt: timestamp,
    catalogStage: '4.3A',
  };
  const settingsOk = await processDoc('platform_settings', 'global', settingsData, 'PlatformSettings');
  if (!settingsOk && isExecute) {
    console.error('[Stage 1 Abort] Error encountered writing platform_settings. Stopping immediately.');
    writeAuditLogAndExit(stage1Audit, 1);
    return;
  }

  // 2. Cooks (5 documents)
  for (const c of localData.cooks) {
    const cookPublicData = {
      ...c,
      migratedAt: timestamp,
      catalogStage: '4.3A',
    };
    const cookOk = await processDoc('cooks', c.id, cookPublicData, 'Cook');
    if (!cookOk && isExecute) {
      console.error(`[Stage 1 Abort] Error writing cook ${c.id}. Stopping immediately.`);
      writeAuditLogAndExit(stage1Audit, 1);
      return;
    }
  }

  // 3. Menu Items (10 documents)
  for (const m of localData.menuItems) {
    const cook = cooksMap.get(m.cookId);
    if (!cook || !cook.userId) {
      throw new Error(`Menu item ${m.id} has invalid cookId ${m.cookId}`);
    }
    const menuItemData = {
      ...m,
      cookUserId: cook.userId,
      migratedAt: timestamp,
      catalogStage: '4.3A',
    };
    const itemOk = await processDoc('menu_items', m.id, menuItemData, 'MenuItem');
    if (!itemOk && isExecute) {
      console.error(`[Stage 1 Abort] Error writing menu item ${m.id}. Stopping immediately.`);
      writeAuditLogAndExit(stage1Audit, 1);
      return;
    }
  }

  // 4. Meal Plans (3 documents)
  for (const mp of localData.mealPlans) {
    const planData = {
      ...mp,
      migratedAt: timestamp,
      catalogStage: '4.3A',
    };
    const planOk = await processDoc('meal_plans', mp.id, planData, 'MealPlan');
    if (!planOk && isExecute) {
      console.error(`[Stage 1 Abort] Error writing meal plan ${mp.id}. Stopping immediately.`);
      writeAuditLogAndExit(stage1Audit, 1);
      return;
    }
  }

  // 5. Promotions (3 documents)
  for (const promo of localData.promotions) {
    const promoData = {
      ...promo,
      migratedAt: timestamp,
      catalogStage: '4.3A',
    };
    const promoOk = await processDoc('promotions', promo.id, promo, 'Promotion');
    if (!promoOk && isExecute) {
      console.error(`[Stage 1 Abort] Error writing promotion ${promo.id}. Stopping immediately.`);
      writeAuditLogAndExit(stage1Audit, 1);
      return;
    }
  }

  writeAuditLogAndExit(stage1Audit, 0);
}

function writeAuditLogAndExit(audit: any, exitCode: number) {
  const auditPath = path.join(BACKUP_DIR, 'migration-stage1-public-audit.json');
  fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2), 'utf8');
  console.log(`\n[Stage 1 Audit] Log written to: ${auditPath}`);
  console.log('====================================================');
  console.log(`Summary: Created=${audit.created.length}, Skipped=${audit.skipped.length}, Errors=${audit.errors.length}`);
  console.log('====================================================');
  process.exit(exitCode);
}

runStage1Migration().catch((err) => {
  console.error('[Stage 1 Exception]:', err.message);
  process.exit(1);
});
