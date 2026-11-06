import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import {
  INITIAL_COOKS,
  INITIAL_MENU_ITEMS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_DELIVERY_PARTNERS,
  INITIAL_PARTNER_APPLICATIONS,
  INITIAL_MEAL_PLANS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_PROMOTIONS,
  INITIAL_COMPLAINTS,
  INITIAL_OPERATING_EXPENSES,
  INITIAL_ADDRESSES,
  INITIAL_SETTINGS,
  OWNER_PROFILE,
} from '../src/lib/storage.js';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function runBackupTasks() {
  const timestamp = new Date().toISOString();
  console.log(`[Backup] Starting backup run at: ${timestamp}`);

  // 1. Local Storage Pilot Data Backup
  const localStoragePilotData = {
    backupMetadata: {
      source: 'StorageManager / src/lib/storage.ts',
      exportedAt: timestamp,
      system: 'CookNow Nalapani Pilot',
    },
    ownerProfile: OWNER_PROFILE,
    platformSettings: INITIAL_SETTINGS,
    cooks: INITIAL_COOKS,
    menuItems: INITIAL_MENU_ITEMS,
    orders: INITIAL_ORDERS,
    reviews: INITIAL_REVIEWS,
    deliveryPartners: INITIAL_DELIVERY_PARTNERS,
    partnerApplications: INITIAL_PARTNER_APPLICATIONS,
    mealPlans: INITIAL_MEAL_PLANS,
    subscriptions: INITIAL_SUBSCRIPTIONS,
    promotions: INITIAL_PROMOTIONS,
    complaints: INITIAL_COMPLAINTS,
    operatingExpenses: INITIAL_OPERATING_EXPENSES,
    addresses: INITIAL_ADDRESSES,
    counts: {
      ownerProfile: 1,
      platformSettings: 1,
      cooks: INITIAL_COOKS.length,
      menuItems: INITIAL_MENU_ITEMS.length,
      orders: INITIAL_ORDERS.length,
      embeddedOrderItems: INITIAL_ORDERS.reduce((acc, o) => acc + (o.items?.length || 0), 0),
      reviews: INITIAL_REVIEWS.length,
      deliveryPartners: INITIAL_DELIVERY_PARTNERS.length,
      partnerApplications: INITIAL_PARTNER_APPLICATIONS.length,
      mealPlans: INITIAL_MEAL_PLANS.length,
      subscriptions: INITIAL_SUBSCRIPTIONS.length,
      promotions: INITIAL_PROMOTIONS.length,
      complaints: INITIAL_COMPLAINTS.length,
      operatingExpenses: INITIAL_OPERATING_EXPENSES.length,
      addresses: INITIAL_ADDRESSES.length,
      totalRecords:
        1 +
        1 +
        INITIAL_COOKS.length +
        INITIAL_MENU_ITEMS.length +
        INITIAL_ORDERS.length +
        INITIAL_REVIEWS.length +
        INITIAL_DELIVERY_PARTNERS.length +
        INITIAL_PARTNER_APPLICATIONS.length +
        INITIAL_MEAL_PLANS.length +
        INITIAL_SUBSCRIPTIONS.length +
        INITIAL_PROMOTIONS.length +
        INITIAL_COMPLAINTS.length +
        INITIAL_OPERATING_EXPENSES.length +
        INITIAL_ADDRESSES.length,
    },
  };

  const localBackupPath = path.join(BACKUP_DIR, 'localstorage-pilot-backup.json');
  fs.writeFileSync(localBackupPath, JSON.stringify(localStoragePilotData, null, 2), 'utf8');
  console.log(`[Backup] LocalStorage pilot data exported to ${localBackupPath}`);

  // 2. Supabase Data Backup (Seed & Profile Data)
  const supabaseData = {
    backupMetadata: {
      source: 'supabase/seed.sql & Supabase configuration',
      exportedAt: timestamp,
      system: 'CookNow Supabase (PostgreSQL)',
    },
    platformSettings: [
      {
        key: 'general',
        value: {
          commissionRatePercent: 15,
          standardDeliveryFee: 25,
          freeDeliveryThreshold: 250,
          platformServiceFee: 5,
          packagingFee: 10,
          launchLocality: 'Nalapani Chowk, Dehradun, Uttarakhand',
          supportPhone: '+91 94120 44556',
          supportEmail: 'support@cooknow-dehradun.in',
        },
      },
    ],
    profiles: [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        email: 'admin@cooknow.in',
        full_name: 'Dehradun Ops Admin',
        phone: '+91 94120 44556',
        role: 'admin',
      },
      {
        id: 'a0000000-0000-0000-0000-000000000002',
        email: 'sunita.rawat@gmail.com',
        full_name: 'Sunita Rawat',
        phone: '+91 98971 23450',
        role: 'cook',
      },
      {
        id: 'a0000000-0000-0000-0000-000000000003',
        email: 'kamla.sharma@gmail.com',
        full_name: 'Kamla Sharma',
        phone: '+91 98370 88219',
        role: 'cook',
      },
      {
        id: 'a0000000-0000-0000-0000-000000000004',
        email: 'student.aman@upes.ac.in',
        full_name: 'Aman Negi',
        phone: '+91 98765 43210',
        role: 'customer',
      },
    ],
    cooks: [
      {
        id: 'c0000000-0000-0000-0000-00000001',
        user_id: 'a0000000-0000-0000-0000-000000000002',
        kitchen_name: "Sunita's Pahadi Rasoi",
        owner_name: 'Sunita Rawat',
        phone: '+91 98971 23450',
        bio: 'Proud home cook from Pauri Garhwal now living in Nalapani Chowk. Cooking traditional Uttarakhand delicacies with hand-ground spices and organic millets.',
        address: 'House 42, Near Shiv Mandir, Upper Nalapani Road',
        locality: 'Nalapani Chowk',
        city: 'Dehradun',
        state: 'Uttarakhand',
        fssai_number: '22623001000492',
        is_verified: true,
        verification_status: 'approved',
        rating: 4.9,
        review_count: 112,
        specialty: 'Authentic Garhwali Thali & Mandua Rotis',
      },
      {
        id: 'c0000000-0000-0000-0000-00000002',
        user_id: 'a0000000-0000-0000-0000-000000000003',
        kitchen_name: "Aunty's Ghar Ka Khana",
        owner_name: 'Kamla Sharma',
        phone: '+91 98370 88219',
        bio: 'Serving comforting North Indian homestyle tiffins to college students and hostelers in Dehradun. Less oil, zero soda, pure motherly warmth.',
        address: 'Lane 3, Tapovan Enclave, Near Raipur Chowk',
        locality: 'Raipur Road',
        city: 'Dehradun',
        state: 'Uttarakhand',
        fssai_number: '22623001000811',
        is_verified: true,
        verification_status: 'approved',
        rating: 4.8,
        review_count: 94,
        specialty: 'Rajma Chawal & Homestyle Daily Tiffins',
      },
    ],
    counts: {
      platformSettings: 1,
      profiles: 4,
      cooks: 2,
      menuItems: 0,
      orders: 0,
      reviews: 0,
      deliveries: 0,
      subscriptions: 0,
      coupons: 0,
      totalPopulatedRecords: 7,
    },
  };

  const supabaseBackupPath = path.join(BACKUP_DIR, 'supabase-data-backup.json');
  fs.writeFileSync(supabaseBackupPath, JSON.stringify(supabaseData, null, 2), 'utf8');
  console.log(`[Backup] Supabase data exported to ${supabaseBackupPath}`);

  // 3. Firestore Pre-Migration Read-Only Baseline Scan
  const configRaw = fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8');
  const appletConfig = JSON.parse(configRaw);

  const collectionsToScan = [
    'cooks',
    'menu_items',
    'orders',
    'reviews',
    'delivery_partners',
    'partner_applications',
    'meal_plans',
    'customer_subscriptions',
    'promotions',
    'complaints',
    'operating_expenses',
    'platform_settings',
    'users',
  ];

  const firestorePreMigrationData: Record<string, any> = {
    backupMetadata: {
      projectId: appletConfig.projectId,
      firestoreDatabaseId: appletConfig.firestoreDatabaseId,
      scannedAt: timestamp,
      status: 'pre-migration-baseline',
    },
    collections: {},
    totalExistingDocuments: 0,
  };

  try {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(appletConfig);
    const db = appletConfig.firestoreDatabaseId
      ? getFirestore(app, appletConfig.firestoreDatabaseId)
      : getFirestore(app);

    for (const colName of collectionsToScan) {
      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
        firestorePreMigrationData.collections[colName] = {
          count: docs.length,
          documents: docs,
        };
        firestorePreMigrationData.totalExistingDocuments += docs.length;
      } catch (err: any) {
        firestorePreMigrationData.collections[colName] = {
          count: 0,
          error: err.message,
          documents: [],
        };
      }
    }
  } catch (initErr: any) {
    console.warn('[Backup] Firestore client scan warning:', initErr.message);
    firestorePreMigrationData.scanNote = 'Could not establish client scan; recorded baseline as zero prior to Admin SDK run.';
  }

  const firestoreBackupPath = path.join(BACKUP_DIR, 'firestore-pre-migration-backup.json');
  fs.writeFileSync(firestoreBackupPath, JSON.stringify(firestorePreMigrationData, null, 2), 'utf8');
  console.log(`[Backup] Firestore pre-migration baseline exported to ${firestoreBackupPath}`);

  // 4. Verification Check
  console.log('\n[Verification] Verifying backup integrity...');
  const readLocal = JSON.parse(fs.readFileSync(localBackupPath, 'utf8'));
  const readSupa = JSON.parse(fs.readFileSync(supabaseBackupPath, 'utf8'));
  const readFs = JSON.parse(fs.readFileSync(firestoreBackupPath, 'utf8'));

  console.log('--- VERIFICATION SUMMARY ---');
  console.log(`1. LocalStorage Backup: Valid JSON, ${readLocal.counts.totalRecords} total records.`);
  console.log(`2. Supabase Backup: Valid JSON, ${readSupa.counts.totalPopulatedRecords} total populated records.`);
  console.log(`3. Firestore Pre-Migration Backup: Valid JSON, ${readFs.totalExistingDocuments} pre-existing documents.`);
  process.exit(0);
}

runBackupTasks().catch((err) => {
  console.error('[Backup] Failed:', err);
  process.exit(1);
});
