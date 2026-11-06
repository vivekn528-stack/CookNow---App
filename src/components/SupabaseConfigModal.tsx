import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  Server,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  UploadCloud,
} from 'lucide-react';
import {
  getSupabaseConfig,
  getSupabaseDiagnostics,
  saveSupabaseConfigToServer,
  supabaseService,
  isSupabaseConfigured,
} from '../lib/supabase';
import { StorageManager } from '../lib/storage';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess,
}) => {
  const currentConfig = getSupabaseConfig();
  const initialDiag = getSupabaseDiagnostics();

  // If the URL in env was accidentally the publishable key, don't pre-populate the URL input with the key
  const defaultUrl =
    currentConfig.url && !currentConfig.url.startsWith('sb_') && !currentConfig.url.startsWith('eyJ')
      ? currentConfig.url
      : '';

  const defaultKey =
    currentConfig.anonKey ||
    (currentConfig.url.startsWith('sb_') ? currentConfig.url : '');

  const [projectUrl, setProjectUrl] = useState(defaultUrl);
  const [anonKey, setAnonKey] = useState(defaultKey);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    stage?: string;
    code?: string;
    message: string;
    diagnosis?: string;
    solution?: string;
    dashboardUrl?: string;
    projectRef?: string;
    tableNeedsMigration?: boolean;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      const diag = getSupabaseDiagnostics();
      if (!projectUrl && cfg.url && !cfg.url.startsWith('sb_') && !cfg.url.startsWith('eyJ')) {
        setProjectUrl(cfg.url);
      }
      if (!anonKey) {
        setAnonKey(cfg.anonKey || (cfg.url.startsWith('sb_') ? cfg.url : ''));
      }

      if (diag.status === 'publishable_key_in_url') {
        setStatusMessage({
          type: 'warning',
          text: `VITE_SUPABASE_URL contains an API key ("${cfg.url.slice(
            0,
            16
          )}...") instead of your Project URL. Please enter your Supabase Project URL below (format: https://<project-ref>.supabase.co).`,
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    setTestResult(null);

    try {
      const result = await supabaseService.testConnection(projectUrl, anonKey);
      setIsTesting(false);
      setTestResult(result);

      if (result.connected) {
        setStatusMessage({
          type: 'success',
          text: result.message,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.message,
        });
      }
    } catch (testErr: any) {
      setIsTesting(false);
      const match = (projectUrl || '').match(/https:\/\/([^.]+)\.supabase\.co/);
      const projectRef = match ? match[1] : '';
      const errStr = `${testErr?.name || ''} ${testErr?.message || ''} ${String(testErr)}`.toLowerCase();
      const isFetchErr = errStr.includes('fetch') || errStr.includes('load failed') || errStr.includes('network');

      const diagResult = {
        connected: false,
        stage: isFetchErr ? 'dns_or_paused' : 'network_exception',
        code: isFetchErr ? 'FAILED_TO_FETCH' : 'TEST_EXCEPTION',
        projectRef,
        message: isFetchErr
          ? `Could not reach ${projectUrl || 'Supabase host'} (Failed to fetch). Host unreachable or paused.`
          : `Connection test error: ${testErr.message || String(testErr)}`,
        diagnosis:
          'The browser could not resolve or connect to the Supabase subdomain. Supabase free-tier projects automatically PAUSE after 7 days of inactivity, deleting their Route53 DNS records until unpaused.',
        solution: projectRef
          ? `Open your Supabase Project Dashboard at https://supabase.com/dashboard/project/${projectRef} and click "Restore Project" to reactivate the database.`
          : 'Log in to Supabase Dashboard and unpause your project.',
        dashboardUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}` : undefined,
      };

      setTestResult(diagResult);
      setStatusMessage({
        type: 'error',
        text: diagResult.message,
      });
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    setTestResult(null);

    let cleanUrl = projectUrl.trim();
    if (cleanUrl.startsWith('sb_') || cleanUrl.startsWith('eyJ')) {
      setIsSaving(false);
      setStatusMessage({
        type: 'error',
        text: 'The URL field contains an API key. Project URLs start with https:// and end with .supabase.co.',
      });
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}.supabase.co`;
    }

    try {
      const saveResult = await saveSupabaseConfigToServer(cleanUrl, anonKey.trim());
      setIsSaving(false);
      setTestResult(saveResult);

      if (saveResult.success) {
        setProjectUrl(cleanUrl);
        setStatusMessage({
          type: saveResult.connected ? 'success' : 'warning',
          text: saveResult.message,
        });
        onConnectionSuccess();
      } else {
        setStatusMessage({
          type: 'error',
          text: saveResult.message,
        });
      }
    } catch (saveErr: any) {
      setIsSaving(false);
      const match = cleanUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      const projectRef = match ? match[1] : '';
      setTestResult({
        connected: false,
        stage: 'save_error',
        code: 'SAVE_EXCEPTION',
        message: `Failed to save configuration: ${saveErr.message || String(saveErr)}`,
        diagnosis: 'Could not communicate with the application server to persist configuration.',
        dashboardUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}` : undefined,
      });
      setStatusMessage({
        type: 'error',
        text: `Error saving configuration: ${saveErr.message || String(saveErr)}`,
      });
    }
  };

  const handleMigrateData = async () => {
    if (!isSupabaseConfigured()) {
      setStatusMessage({
        type: 'warning',
        text: 'Connect to live Supabase first before migrating data.',
      });
      return;
    }

    setIsMigrating(true);
    setMigrationSummary(null);

    try {
      const res = await supabaseService.migrateLocalDataToSupabase({
        cooks: StorageManager.getCooks(),
        menuItems: StorageManager.getMenuItems(),
        promotions: StorageManager.getPromotions(),
        mealPlans: StorageManager.getMealPlans(),
        deliveryPartners: StorageManager.getDeliveryPartners(),
      });

      setIsMigrating(false);
      if (res.success) {
        setMigrationSummary(
          `✅ Migrated successfully: ${res.insertedCounts.cooks} cooks, ${res.insertedCounts.menuItems} meals, ${res.insertedCounts.deliveryPartners} delivery riders, ${res.insertedCounts.mealPlans} meal plans.`
        );
      } else {
        setMigrationSummary(`⚠️ Migration finished with notices: ${res.errors.join('; ')}`);
      }
    } catch (err: any) {
      setIsMigrating(false);
      setMigrationSummary(`Migration failed: ${err.message}`);
    }
  };

  const currentDiagnostics = getSupabaseDiagnostics();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 text-xs">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Supabase PostgreSQL Connection & Settings
              </h2>
              <p className="text-[11px] text-stone-500">
                Primary persistent database for CookNow Nalapani marketplace
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

        <div className="p-6 space-y-5">
          {/* Diagnostic Status Alert */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              currentDiagnostics.isConfigured
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            {currentDiagnostics.isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold text-sm">
                {currentDiagnostics.isConfigured
                  ? 'Supabase Backend Connected'
                  : 'Supabase Disconnected — Operating in Local Storage Fallback'}
              </div>
              <p className="text-stone-700 text-[11px] leading-relaxed">
                {currentDiagnostics.message}
              </p>
              {currentDiagnostics.status === 'publishable_key_in_url' && (
                <div className="mt-2 p-2.5 bg-amber-100/70 border border-amber-300/80 rounded-lg text-amber-950 text-[11px] space-y-1">
                  <div className="font-bold">What happened?</div>
                  <p>
                    Your publishable key (<code className="font-mono bg-amber-200/60 px-1 rounded">sb_publishable_...</code>) was saved in both <code className="font-mono bg-amber-200/60 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono bg-amber-200/60 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.
                  </p>
                  <p>
                    To connect to PostgreSQL, please enter your actual <strong>Supabase Project URL</strong> below (e.g. <code className="font-mono bg-amber-200/60 px-1 rounded">https://your-ref.supabase.co</code>).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveAndConnect} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-stone-900">
                  Supabase Project URL *
                </label>
                <span className="text-[10px] text-stone-400">
                  Expected format: https://&lt;project-ref&gt;.supabase.co
                </span>
              </div>
              <input
                type="text"
                required
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none"
              />
              <p className="text-stone-500 text-[10px] mt-1">
                Found in: Supabase Dashboard → Project Settings (gear icon) → Data API / API → Project URL.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-stone-900">
                  Supabase Anon / Publishable Key *
                </label>
                <span className="text-[10px] text-emerald-800 font-medium">
                  {anonKey ? 'Key populated' : 'Required'}
                </span>
              </div>
              <input
                type="text"
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="sb_publishable_... or eyJhbGciOi..."
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none"
              />
              <p className="text-stone-500 text-[10px] mt-1">
                Safe for frontend browsers under Row Level Security. Never enter SUPABASE_SERVICE_ROLE_KEY here.
              </p>
            </div>

            {/* Rich Diagnostic Feedback Card */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                  testResult.connected
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : testResult.stage === 'dns' || testResult.code === 'DNS_ENOTFOUND'
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {testResult.connected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Live Supabase PostgreSQL Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        {testResult.stage === 'dns' || testResult.stage === 'dns_or_paused' || testResult.code === 'DNS_ENOTFOUND' || testResult.code === 'FAILED_TO_FETCH'
                          ? 'Supabase Project Host Unreachable (Project Paused in Dashboard)'
                          : 'Supabase Connection Test Result'}
                      </span>
                    </>
                  )}
                </div>

                <p className="leading-relaxed font-medium">{testResult.message}</p>

                {testResult.diagnosis && (
                  <div className="p-3 bg-white/80 rounded-lg border border-stone-200/80 space-y-2 text-[11px] text-stone-800">
                    <div>
                      <span className="font-bold text-stone-900">Root Cause Diagnosis: </span>
                      <span className="leading-relaxed">{testResult.diagnosis}</span>
                    </div>

                    {testResult.solution && (
                      <div className="pt-1 border-t border-stone-200/60">
                        <span className="font-bold text-emerald-950">Recommended Resolution: </span>
                        <span className="leading-relaxed text-stone-700 whitespace-pre-line">{testResult.solution}</span>
                      </div>
                    )}

                    {testResult.dashboardUrl && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <a
                          href={testResult.dashboardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Supabase Dashboard ({testResult.projectRef || 'tphoggbtizpzudbhgtjo'}) ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {!testResult.connected && (
                  <div className="p-2.5 bg-amber-100/60 border border-amber-200/80 rounded-lg text-[11px] text-amber-950 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
                    <span>
                      <strong>Safe Offline Mode Active:</strong> CookNow continues serving Nalapani Chowk home-cooked meals using local storage. No data is lost.
                    </span>
                  </div>
                )}

                {testResult.tableNeedsMigration && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] space-y-1">
                    <div className="font-bold">Database Tables Not Initialized:</div>
                    <p>
                      The database connection is established, but the marketplace tables do not exist yet. Please run the SQL migration located at <code className="bg-blue-100 px-1 rounded font-mono">supabase/migrations/001_initial_schema.sql</code> in your Supabase SQL Editor.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!testResult && statusMessage && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-medium'
                    : statusMessage.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-950 font-medium'
                    : 'bg-amber-50 border-amber-200 text-amber-950 font-medium'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !projectUrl}
                className="px-4 py-2 border border-stone-300 hover:bg-stone-50 font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Testing Network...' : 'Test Connection'}
              </button>

              <button
                type="submit"
                disabled={isSaving || !projectUrl || !anonKey}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                <Server className="w-4 h-4" />
                {isSaving ? 'Saving & Verifying...' : 'Save & Connect Supabase'}
              </button>
            </div>
          </form>

          {/* Data Migration Option (Once connected) */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                <UploadCloud className="w-4 h-4 text-emerald-800" />
                Sync Local Storage Pilot Records to PostgreSQL
              </div>
              <span className="text-[10px] text-stone-500">Zero data loss</span>
            </div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              Transfer existing Nalapani Chowk home cooks, student thalis, meal plans, and delivery partners from your local browser storage into Supabase PostgreSQL tables.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleMigrateData}
                disabled={isMigrating}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isMigrating ? 'animate-bounce' : ''}`} />
                {isMigrating ? 'Migrating Records...' : 'Migrate Local Data to Supabase'}
              </button>
            </div>
            {migrationSummary && (
              <div className="p-2.5 bg-stone-100 border border-stone-300 rounded-lg text-[11px] font-mono text-stone-800">
                {migrationSummary}
              </div>
            )}
          </div>

          {/* Quick Step Guide */}
          <div className="border-t border-stone-200 pt-4 space-y-2">
            <div className="font-bold text-stone-900 text-[11px] uppercase tracking-wider">
              Where to find your Supabase credentials:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-stone-600 text-[11px]">
              <li>Log in to your <strong>Supabase Dashboard</strong>.</li>
              <li>Select your project for CookNow.</li>
              <li>Click the <strong>Project Settings</strong> (gear icon at the bottom left).</li>
              <li>Select <strong>Data API</strong> (or <strong>API</strong>).</li>
              <li>Under <strong>Project URL</strong>, copy the HTTPS address (format: <code className="bg-stone-100 px-1 rounded font-mono">https://&lt;project-ref&gt;.supabase.co</code>).</li>
              <li>Under <strong>API Keys</strong>, copy the <strong>Publishable key</strong> (<code className="bg-stone-100 px-1 rounded font-mono">sb_publishable_...</code>).</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
