import React, { useState } from 'react';
import { X, Database, ShieldCheck, CreditCard, Copy, Check, Terminal, Server, ExternalLink } from 'lucide-react';
import { supabaseService, isSupabaseConfigured } from '../lib/supabase';
import { StorageManager } from '../lib/storage';

interface DatabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupabaseConfig?: () => void;
}

export const DatabaseGuideModal: React.FC<DatabaseGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenSupabaseConfig,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationReport, setMigrationReport] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const schemaExample = `// 1. Initial Tables (supabase/migrations/001_initial_schema.sql)
- profiles (users with roles: customer, cook, delivery, admin)
- cooks (kitchens, FSSAI, verification status, 15% commission)
- addresses (hostels, PGs, rooms in Nalapani Chowk)
- menu_items (prices in INR, dietary types, student meal tiers)
- orders (lifecycle states, item breakdowns, payment details)
- order_items (item details, portions)
- reviews (anonymized ratings 1-5, comments)
- platform_settings (commission rate, delivery fees)

// 2. Extended Tables (supabase/migrations/002_extended_features.sql)
- partner_applications (restaurant & cook onboarding workflow)
- delivery_partners (fleet management, shifts, payouts)
- meal_plans (monthly tiffins, student budget plans, schedules)
- customer_subscriptions (meal counts, holiday pauses, addresses)
- promotions (discount engine, funding sources: CookNow/Partner/Shared)
- complaints (confidential student complaints, refund logging)
- operating_expenses (financial ledger, marketing, delivery subsidies)
- admin_audit_logs (owner action traceability)`;

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
                Nalapani Chowk Pilot · Full-Stack Integration Boundary
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
          {/* Honest Status Report */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="font-bold text-sm text-emerald-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Honest Runtime Implementation Status
            </div>
            <div className="space-y-1 text-emerald-900">
              <p>
                ✅ <strong>Fully Functional Now:</strong> Complete customer ordering, shopping cart math, Indian phone validation, Nalapani Chowk localities, live order lifecycle transitions, Cook kitchen management, Admin FSSAI verification audits, and 15% commission calculations with persistent local storage.
              </p>
              <p>
                🔒 <strong>Cash on Delivery (Active):</strong> Transparently active and safe for local deliveries in Dehradun.
              </p>
              <p>
                🌐 <strong>External Gateway & Auth Boundaries:</strong> Supabase PostgreSQL schemas and Razorpay payment webhook boundaries are fully pre-built in code and migrations, ready for your external production API keys.
              </p>
            </div>
          </div>

          {/* Database Schema Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Server className="w-4 h-4 text-stone-600" />
                Prepared Supabase PostgreSQL Schema
              </h3>
              <button
                onClick={() => handleCopy(schemaExample, 'schema')}
                className="text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'schema' ? 'Copied' : 'Copy Schema'}</span>
              </button>
            </div>
            <pre className="p-3 bg-stone-900 text-stone-200 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
              {schemaExample}
            </pre>
            <p className="text-stone-500 text-[11px]">
              Full SQL migration file with Row-Level Security (RLS) is located at <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">supabase/migrations/001_initial_schema.sql</code>.
            </p>
          </div>

          {/* Live Supabase Connection Test & Migration Control */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-800" />
              Live Supabase Integration & Data Migration Control
            </h3>
            <p className="text-stone-600">
              Test your configured credentials (<code className="bg-stone-200 px-1 py-0.5 rounded text-stone-900">VITE_SUPABASE_URL</code> and <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-900">VITE_SUPABASE_ANON_KEY</code>) or migrate existing local storage pilot data safely to PostgreSQL.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={async () => {
                  setTestStatus('testing');
                  setTestMessage(null);
                  const result = await supabaseService.testConnection();
                  setTestStatus(result.connected ? 'success' : 'failed');
                  setTestMessage(result.message);
                }}
                disabled={testStatus === 'testing'}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {testStatus === 'testing' ? 'Testing Connection...' : 'Test Supabase Connection'}
              </button>

              {onOpenSupabaseConfig && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSupabaseConfig();
                  }}
                  className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Configure Supabase Project URL →
                </button>
              )}

              <button
                onClick={async () => {
                  if (!isSupabaseConfigured()) {
                    setMigrationReport('Please configure valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.');
                    return;
                  }
                  setIsMigrating(true);
                  setMigrationReport(null);
                  const result = await supabaseService.migrateLocalDataToSupabase({
                    cooks: StorageManager.getCooks(),
                    menuItems: StorageManager.getMenuItems(),
                    promotions: StorageManager.getPromotions(),
                    mealPlans: StorageManager.getMealPlans(),
                    deliveryPartners: StorageManager.getDeliveryPartners(),
                  });
                  setIsMigrating(false);
                  if (result.success) {
                    setMigrationReport(
                      `✅ Migration Complete! Upserted: ${result.insertedCounts.cooks} cooks, ${result.insertedCounts.menuItems} menu items, ${result.insertedCounts.deliveryPartners} riders, ${result.insertedCounts.mealPlans} meal plans.`
                    );
                  } else {
                    setMigrationReport(`⚠️ Migration reported errors: ${result.errors.join('; ')}`);
                  }
                }}
                disabled={isMigrating}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isMigrating ? 'Migrating Records...' : 'Migrate Local Storage Data to Supabase'}
              </button>
            </div>

            {testMessage && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-2 ${
                  testStatus === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div><strong>Connection Test Result:</strong> {testMessage}</div>
                {testStatus === 'failed' && (
                  <div className="pt-1">
                    <a
                      href="https://supabase.com/dashboard/project/tphoggbtizpzudbhgtjo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-md text-[11px] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Supabase Dashboard (tphoggbtizpzudbhgtjo) ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {migrationReport && (
              <div className="p-3 bg-stone-100 rounded-lg border border-stone-300 text-xs text-stone-800">
                <strong>Migration Report:</strong> {migrationReport}
              </div>
            )}
          </div>

          {/* Vercel & GitHub Deployment */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-stone-600" />
              GitHub & Vercel Deployment Steps
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-stone-600 pl-1">
              <li>
                Push codebase to your GitHub repository.
              </li>
              <li>
                Import into <strong>Vercel</strong> (Framework Preset: Vite, Build Command: <code className="bg-stone-100 px-1 rounded">npm run build</code>, Output Directory: <code className="bg-stone-100 px-1 rounded">dist</code>).
              </li>
              <li>
                Add environment variables in Vercel project settings:
                <div className="mt-1 bg-stone-100 p-2 rounded font-mono text-[11px] text-stone-800 space-y-0.5">
                  <div># Supabase Primary Database</div>
                  <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
                  <div>VITE_SUPABASE_ANON_KEY=your-anon-public-key</div>
                  <div className="pt-1"># Firebase Google Sign-In (cooknow-9444c)</div>
                  <div>VITE_FIREBASE_API_KEY=AIzaSy...</div>
                  <div>VITE_FIREBASE_APP_ID=1:465197547970:web:...</div>
                  <div>VITE_FIREBASE_AUTH_DOMAIN=cooknow-9444c.firebaseapp.com</div>
                  <div>VITE_FIREBASE_PROJECT_ID=cooknow-9444c</div>
                </div>
              </li>
              <li>
                Apply SQL migrations into your Supabase SQL editor:
                <div className="mt-1 font-mono text-[10px] text-stone-600 pl-3">
                  <div>1. supabase/migrations/001_initial_schema.sql</div>
                  <div>2. supabase/migrations/002_extended_features.sql</div>
                  <div>3. (Optional) supabase/seed.sql</div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
