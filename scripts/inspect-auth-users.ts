import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const CONFIG_PATH = path.resolve(process.cwd(), 'firebase-applet-config.json');

async function inspectAuthUsers() {
  console.log('[Auth Inspection] Reading firebase-applet-config.json...');
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
  console.log(`[Auth Inspection] Inspecting Firebase Auth users for project: ${appletConfig.projectId}...`);

  try {
    const listResult = await auth.listUsers(100);
    console.log(`[Auth Inspection] Successfully queried Firebase Authentication.`);
    console.log(`[Auth Inspection] Total registered Firebase Auth users found: ${listResult.users.length}`);

    const userSummary = listResult.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      emailVerified: u.emailVerified,
      displayName: u.displayName,
      phoneNumber: u.phoneNumber,
      providerData: u.providerData.map((p) => p.providerId),
      createdAt: u.metadata.creationTime,
      lastSignInTime: u.metadata.lastSignInTime,
    }));

    console.log('--- REGISTERED FIREBASE USERS ---');
    console.log(JSON.stringify(userSummary, null, 2));

    // Specifically check for our pilot entities:
    const targetEmails = [
      'vivekn528@gmail.com',
      'sunita.rawat@gmail.com',
      'kamla.sharma@gmail.com',
      'student.aman@upes.ac.in',
      'suresh.semwal@cooknow-partner.in',
      'deepak.panwar@cooknow-partner.in',
      'admin@cooknow.in',
    ];

    console.log('\n--- TARGET PILOT ENTITY LOOKUP ---');
    for (const email of targetEmails) {
      try {
        const found = await auth.getUserByEmail(email);
        console.log(`FOUND ${email} -> UID: ${found.uid} (verified: ${found.emailVerified})`);
      } catch (err: any) {
        console.log(`NOT FOUND ${email}: ${err.code || err.message}`);
      }
    }
  } catch (err: any) {
    console.error(`[Auth Inspection Error]:`, err.message);
    if (err.errorInfo) {
      console.error(`Error info:`, JSON.stringify(err.errorInfo));
    }
  }
}

inspectAuthUsers().catch((err) => {
  console.error('[Fatal Error]:', err);
  process.exit(1);
});
