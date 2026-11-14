import React, { useState } from 'react';
import { X, Database, ShieldCheck, Copy, Check, Terminal, Server } from 'lucide-react';

interface DatabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupabaseConfig?: () => void;
}

export const DatabaseGuideModal: React.FC<DatabaseGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const firestoreCollectionsSchema = `// PRIMARY DATABASE: Cloud Firestore (Project: cooknow-9444c)
// Single Source of Truth for all CookNow operational & financial data
- users (Firebase Auth profiles & server-enforced roles)
- cooks (verified kitchens, FSSAI, 15% commission)
- menu_items (INR pricing, dietary types, Student Special Thalis ₹49/₹69/₹79)
- orders (server-validated totals, idempotency, lifecycle transitions, COD status)
- order_idempotency (duplicate order prevention locks)
- reviews (order-verified ratings 1-5)
- meal_plans & customer_subscriptions (monthly tiffin plans)
- promotions & coupon_redemptions (usage limits & budget caps)
- partner_applications & delivery_partners (onboarding & fleet)
- complaints (customer support & refund audit trail)
- operating_expenses & settlements (immutable financial records & reversals)
- platform_settings (global fees & commission config)
- audit_logs (administrative action history)

// OPTIONAL / STANDBY / NOT REQUIRED: Archived Supabase SQL Reference
// Preserved in supabase/migrations/001_initial_schema.sql & 002_extended_features.sql`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-800" />
            <div>
              <h2 className="text-base font-bold text-stone-900">
                CookNow Architecture & Deployment Guide
              </h2>
              <p className="text-xs text-stone-500">
                Nalapani Chowk Pilot · Firebase-First Single Source of Truth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs text-stone-700">
          {/* Primary Architecture Status */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="font-bold text-sm text-emerald-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Approved Production Architecture
            </div>
            <div className="space-y-1.5 text-emerald-900">
              <p>
                🔥 <strong>PRIMARY DATABASE — Cloud Firestore (<code className="font-mono">cooknow-9444c</code>):</strong> Active Single Source of Truth for kitchens, menus, orders, COD reconciliation, payouts, expenses, and audit logs.
              </p>
              <p>
                🔐 <strong>Firebase Authentication & Storage:</strong> Google Sign-In identity verification with server-side Firebase ID token validation and media storage.
              </p>
              <p>
                💵 <strong>Cash on Delivery (Active):</strong> Enabled across Dehradun hubs (15% commission, ₹25 delivery below ₹250, ₹5 platform fee, ₹10 packaging fee, 0% GST; UPI/online disabled).
              </p>
              <p>
                💤 <strong>Supabase PostgreSQL — OPTIONAL / STANDBY / NOT REQUIRED:</strong> Not required for normal CookNow operations, customer checkout, or financial reporting.
              </p>
            </div>
          </div>

          {/* Firestore & Archive Schema Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Server className="w-4 h-4 text-stone-600" />
                Cloud Firestore Collections (Primary Database)
              </h3>
              <button
                onClick={() => handleCopy(firestoreCollectionsSchema, 'schema')}
                className="text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'schema' ? 'Copied' : 'Copy Schema'}</span>
              </button>
            </div>
            <pre className="p-3 bg-stone-900 text-stone-200 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
              {firestoreCollectionsSchema}
            </pre>
            <p className="text-stone-500 text-[11px]">
              Historical PostgreSQL reference migrations remain archived at <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">supabase/migrations/</code> for optional standby reference only.
            </p>
          </div>

          {/* Inactive Standby Notice */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Server className="w-4 h-4 text-stone-500" />
                Supabase PostgreSQL (Optional / Standby / Not Required)
              </h3>
              <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-bold text-[10px]">
                Inactive Standby
              </span>
            </div>
            <p className="text-stone-600">
              All operational writes, server-authoritative order placement, and owner financial analytics run directly on Cloud Firestore (<code className="font-mono">cooknow-9444c</code>). Legacy Supabase connection and local-storage migration actions are intentionally disabled.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 opacity-70">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="px-3.5 py-2 bg-stone-200 text-stone-500 font-bold rounded-lg cursor-not-allowed"
              >
                Supabase Connection Test (Disabled · Standby)
              </button>

              <button
                type="button"
                disabled
                aria-disabled="true"
                className="px-3.5 py-2 bg-stone-200 text-stone-500 font-bold rounded-lg cursor-not-allowed"
              >
                Local-Storage Migration (Disabled · Firestore Primary)
              </button>
            </div>
          </div>

          {/* Vercel & GitHub Deployment */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-stone-600" />
              GitHub & Vercel Hobby Deployment Steps
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-stone-600 pl-1">
              <li>
                Deploy from GitHub repository <code className="bg-stone-100 px-1 rounded">vivekn528-stack/CookNow---App</code> (<code className="bg-stone-100 px-1 rounded">main</code> branch).
              </li>
              <li>
                Configure Vercel Project (Framework Preset: Vite, Build Command: <code className="bg-stone-100 px-1 rounded">npm run build</code>, Output Directory: <code className="bg-stone-100 px-1 rounded">dist</code>).
              </li>
              <li>
                Configure Environment Variables in Vercel project settings:
                <div className="mt-1 bg-stone-100 p-2.5 rounded font-mono text-[11px] text-stone-800 space-y-0.5">
                  <div># Public Frontend Variables (Browser Safe)</div>
                  <div>VITE_FIREBASE_API_KEY=...</div>
                  <div>VITE_FIREBASE_APP_ID=...</div>
                  <div>VITE_FIREBASE_AUTH_DOMAIN=cooknow-9444c.firebaseapp.com</div>
                  <div>VITE_FIREBASE_PROJECT_ID=cooknow-9444c</div>
                  <div>VITE_FIREBASE_STORAGE_BUCKET=cooknow-9444c.firebasestorage.app</div>
                  <div>VITE_FIREBASE_MESSAGING_SENDER_ID=...</div>
                  <div>VITE_FIREBASE_DATABASE_ID=ai-studio-cooknowhomestyle-7c8332e7-39bc-4862-8a92-262d83edb331</div>
                  <div className="pt-1.5"># Server-Only Firebase Admin Credentials (NEVER use VITE_ prefix)</div>
                  <div>FIREBASE_PROJECT_ID=cooknow-9444c</div>
                  <div>FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@cooknow-9444c.iam.gserviceaccount.com</div>
                  <div>FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"</div>
                  <div># Or single JSON variable: FIREBASE_SERVICE_ACCOUNT_JSON=&#123;...&#125;</div>
                </div>
              </li>
              <li>
                Ensure Firestore security rules (<code className="bg-stone-100 px-1 rounded">firestore.rules</code>) are published to <code className="bg-stone-100 px-1 rounded">cooknow-9444c</code>. Supabase setup is not required.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

