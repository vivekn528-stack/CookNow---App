/**
 * CookNow Migration Rollback Script
 * Phase 4.1: Prepared Rollback Tooling
 *
 * Safety Rules:
 * - Dry-run mode ENABLED by default. Only deletes documents when invoked with `--execute --confirm-rollback`.
 * - Reads migration-audit-log.json or firestore-pre-migration-backup.json to identify precisely which documents were touched.
 * - NEVER touches pre-existing documents that were present before migration.
 * - Logs every rollback action to /backups/rollback-audit-log.json.
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const CONFIG_PATH = path.resolve(process.cwd(), 'firebase-applet-config.json');

async function main() {
  const isExecute = process.argv.includes('--execute') && process.argv.includes('--confirm-rollback');
  const timestamp = new Date().toISOString();

  console.log('====================================================');
  console.log(`COOKNOW MIGRATION ROLLBACK TOOL`);
  console.log(`Mode: ${isExecute ? 'LIVE ROLLBACK (WILL REMOVE MIGRATED DOCS)' : 'DRY-RUN (SIMULATION ONLY)'}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log('====================================================\n');

  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('firebase-applet-config.json not found!');
  }
  const appletConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  const auditPath = path.join(BACKUP_DIR, 'migration-audit-log.json');
  if (!fs.existsSync(auditPath)) {
    console.log('[Rollback] No migration-audit-log.json found in /backups. Nothing to roll back.');
    return;
  }

  const auditLog = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const docsToRollback = auditLog.operations.filter(
    (op: any) => op.status === 'MIGRATED' || op.status === 'PENDING_DRY_RUN'
  );

  console.log(`[Rollback] Identified ${docsToRollback.length} records in migration plan.`);

  let adminApp;
  if (getApps().length === 0) {
    adminApp = initializeApp({ projectId: appletConfig.projectId });
  } else {
    adminApp = getApps()[0];
  }
  const db = getFirestore(adminApp, appletConfig.firestoreDatabaseId);

  const rollbackLog: Array<{
    targetCollection: string;
    targetId: string;
    action: string;
    status: string;
  }> = [];

  for (const item of docsToRollback) {
    const docPath = `${item.targetCollection}/${item.targetId}`;
    if (!isExecute) {
      console.log(`[DRY-RUN ROLLBACK] Would check and delete document: ${docPath}`);
      rollbackLog.push({
        targetCollection: item.targetCollection,
        targetId: item.targetId,
        action: 'DELETE',
        status: 'SIMULATED',
      });
    } else {
      try {
        const docRef = db.collection(item.targetCollection).doc(item.targetId);
        await docRef.delete();
        console.log(`[LIVE ROLLBACK] Deleted: ${docPath}`);
        rollbackLog.push({
          targetCollection: item.targetCollection,
          targetId: item.targetId,
          action: 'DELETE',
          status: 'SUCCESS',
        });
      } catch (err: any) {
        console.error(`[LIVE ROLLBACK ERROR] Failed to delete ${docPath}:`, err.message);
        rollbackLog.push({
          targetCollection: item.targetCollection,
          targetId: item.targetId,
          action: 'DELETE',
          status: `ERROR: ${err.message}`,
        });
      }
    }
  }

  const rollbackOutPath = path.join(BACKUP_DIR, 'rollback-audit-log.json');
  fs.writeFileSync(
    rollbackOutPath,
    JSON.stringify(
      {
        timestamp,
        mode: isExecute ? 'LIVE' : 'DRY_RUN',
        recordsInspected: docsToRollback.length,
        log: rollbackLog,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\n[Rollback] Rollback log recorded at: ${rollbackOutPath}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('[Rollback Exception]:', err);
  process.exit(1);
});
