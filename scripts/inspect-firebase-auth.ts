import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const CONFIG_PATH = path.resolve(process.cwd(), 'firebase-applet-config.json');

async function main() {
  console.log('====================================================');
  console.log('FIREBASE AUTHENTICATION IDENTITY INSPECTION');
  console.log('====================================================');

  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('firebase-applet-config.json not found!');
  }
  const appletConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  let adminApp;
  if (getApps().length === 0) {
    adminApp = initializeApp({
      projectId: appletConfig.projectId,
    });
  } else {
    adminApp = getApps()[0];
  }

  const auth = getAuth(adminApp);

  try {
    console.log(`[Auth Inspect] Querying Firebase Auth users for project: ${appletConfig.projectId}...`);
    const listUsersResult = await auth.listUsers(100);
    console.log(`[Auth Inspect] Found ${listUsersResult.users.length} registered Firebase Auth users.\n`);

    const registeredUsers = listUsersResult.users.map((u) => ({
      uid: u.uid,
      email: u.email || 'NO_EMAIL',
      emailVerified: u.emailVerified,
      displayName: u.displayName || 'NO_NAME',
      phoneNumber: u.phoneNumber || 'NO_PHONE',
      disabled: u.disabled,
      creationTime: u.metadata.creationTime,
      lastSignInTime: u.metadata.lastSignInTime,
    }));

    console.log('--- ACTUAL FIREBASE AUTH USERS ---');
    console.log(JSON.stringify(registeredUsers, null, 2));

    // Pilot identity checklist
    const pilotIdentities = [
      { role: 'Super Admin', email: 'vivekn528@gmail.com', legacyId: 'admin-vivek' },
      { role: 'Cook 1 (Sunita Rawat)', email: 'sunita.rawat@gmail.com', legacyId: 'user-cook-1', cookId: 'cook-1' },
      { role: 'Cook 2 (Kamla Sharma)', email: 'kamla.sharma@gmail.com', legacyId: 'user-cook-2', cookId: 'cook-2' },
      { role: 'Cook 3 (Harpreet Kaur)', email: 'harpreet.kaur@gmail.com', legacyId: 'user-cook-3', cookId: 'cook-3' },
      { role: 'Cook 4 (Vikram Rawat)', email: 'vikram.rawat@gmail.com', legacyId: 'user-cook-4', cookId: 'cook-4' },
      { role: 'Cook 5 (Manish Bhatt)', email: 'manish.bhatt@gmail.com', legacyId: 'user-cook-5', cookId: 'cook-5' },
      { role: 'Rider 1 (Suresh Semwal)', email: 'suresh.semwal@cooknow-partner.in', legacyId: 'user-dp-1', partnerId: 'dp-1' },
      { role: 'Rider 2 (Deepak Panwar)', email: 'deepak.panwar@cooknow-partner.in', legacyId: 'user-dp-2', partnerId: 'dp-2' },
      { role: 'Rider 3 (Rahul Rawat)', email: 'rahul.rawat@gmail.com', legacyId: 'user-dp-3', partnerId: 'dp-3' },
      { role: 'Customer 1 (Aman Negi)', email: 'student.aman@upes.ac.in', legacyId: 'cust-1' },
      { role: 'Customer 2 (Priya Joshi)', email: 'priya.joshi@dit.ac.in', legacyId: 'cust-2' },
    ];

    console.log('\n--- IDENTITY MAPPING AUDIT ---');
    const mappingAudit: Array<{
      role: string;
      email: string;
      legacyId: string;
      actualFirebaseUid: string | null;
      isActualUid: boolean;
      status: 'VERIFIED_AUTH_USER' | 'MISSING_IN_FIREBASE_AUTH';
    }> = [];

    for (const p of pilotIdentities) {
      const match = registeredUsers.find(
        (u) => u.email.toLowerCase() === p.email.toLowerCase() || u.uid === p.legacyId
      );
      mappingAudit.push({
        role: p.role,
        email: p.email,
        legacyId: p.legacyId,
        actualFirebaseUid: match ? match.uid : null,
        isActualUid: match ? match.uid === p.legacyId : false,
        status: match ? 'VERIFIED_AUTH_USER' : 'MISSING_IN_FIREBASE_AUTH',
      });
    }

    console.log(JSON.stringify(mappingAudit, null, 2));

    const outPath = path.resolve(process.cwd(), 'backups', 'firebase-auth-users-audit.json');
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          projectId: appletConfig.projectId,
          totalRegisteredUsers: registeredUsers.length,
          registeredUsers,
          mappingAudit,
        },
        null,
        2
      ),
      'utf8'
    );
    console.log(`\n[Auth Inspect] Saved inspection audit to ${outPath}`);
  } catch (err: any) {
    console.error('[Auth Inspect Error]:', err.message);
    // If ADC permissions or service account doesn't have Firebase Auth Admin privileges
    const outPath = path.resolve(process.cwd(), 'backups', 'firebase-auth-users-audit.json');
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          projectId: appletConfig.projectId,
          error: err.message,
          note: 'Firebase Admin SDK Auth inspection encountered credential limitation.',
        },
        null,
        2
      ),
      'utf8'
    );
  }
}

main().catch((err) => {
  console.error('[Fatal Error]:', err);
  process.exit(1);
});
