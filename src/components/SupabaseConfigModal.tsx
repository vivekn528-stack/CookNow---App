import React from 'react';
import { X, Database, ShieldCheck, Server } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 text-xs">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Supabase PostgreSQL — Optional / Standby / Not Required
              </h2>
              <p className="text-[11px] text-stone-500">
                Primary Database: Cloud Firestore (cooknow-9444c) · Standby Mode
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
          <div className="p-4 rounded-xl border bg-emerald-50/80 border-emerald-200 text-emerald-950 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm">
                Cloud Firestore (cooknow-9444c) is the Primary Database
              </div>
              <p className="text-emerald-900 text-[11px] leading-relaxed">
                Supabase PostgreSQL is strictly optional standby only and is not required for normal CookNow operations, customer checkout, authentication, or financial reporting.
              </p>
            </div>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-stone-500" />
                Standby Controls (Inactive)
              </span>
              <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-bold text-[10px]">
                Not Required
              </span>
            </div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              Connection editing, network testing, and browser-to-Supabase data migrations are disabled to protect Cloud Firestore as the single source of truth. Preserved SQL migration schemas remain in <code className="bg-stone-200 px-1 rounded">supabase/migrations/</code>.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 opacity-70">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="px-4 py-2 bg-stone-200 text-stone-500 font-bold rounded-xl cursor-not-allowed"
              >
                Test Connection (Disabled)
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="px-4 py-2 bg-stone-200 text-stone-500 font-bold rounded-xl cursor-not-allowed"
              >
                Save &amp; Connect Supabase (Disabled)
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="px-4 py-2 bg-stone-200 text-stone-500 font-bold rounded-xl cursor-not-allowed"
              >
                Migrate Local Data (Disabled)
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

