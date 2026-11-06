import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { OWNER_PROFILE, StorageManager } from '../lib/storage';
import {
  isFirebaseConfigured,
  ensureFirebaseInitialized,
  signInWithGoogle,
  verifyOwnerWithServer,
} from '../lib/firebase';

interface OwnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export const OwnerAuthModal: React.FC<OwnerAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [verificationStep, setVerificationStep] = useState<
    'idle' | 'google_popup' | 'server_validating' | 'completed'
  >('idle');
  const [isConfigured, setIsConfigured] = useState<boolean>(() => isFirebaseConfigured());

  useEffect(() => {
    let isMounted = true;
    ensureFirebaseInitialized().then((configured) => {
      if (isMounted) setIsConfigured(configured);
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsAuthenticating(true);
    setVerificationStep('google_popup');

    try {
      // 1. Authenticate with Google via Firebase Client SDK
      const authResult = await signInWithGoogle();

      if (authResult.error || !authResult.user || !authResult.idToken) {
        setError(authResult.error || 'Google authentication failed or was cancelled.');
        setIsAuthenticating(false);
        setVerificationStep('idle');
        return;
      }

      setVerificationStep('server_validating');

      // 2. Strict Server-Side Verification Gate
      // Never trust client email alone. The token is sent to /api/auth/verify-owner.
      const serverResult = await verifyOwnerWithServer(authResult.idToken);

      if (serverResult.verified) {
        setSuccessMsg(
          `Verified: ${serverResult.fullName || 'Vivek Singh Negi'} (${serverResult.email}). Server-side authorization granted.`
        );
        setVerificationStep('completed');
        StorageManager.setOwnerAuthenticated(true);

        setTimeout(() => {
          setIsAuthenticating(false);
          onAuthenticated();
          onClose();
        }, 800);
      } else {
        // Server rejected elevated access
        setError(
          serverResult.error ||
            'Server-side authorization check rejected. Elevated Owner privileges cannot be granted.'
        );
        setIsAuthenticating(false);
        setVerificationStep('idle');
      }
    } catch (err: any) {
      setError(`Unexpected error during authorization: ${err.message}`);
      setIsAuthenticating(false);
      setVerificationStep('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Owner & Super Admin Access</h2>
              <p className="text-xs text-stone-400">CookNow Executive Command Centre</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Access Denied</span>
                <span className="text-[11px] leading-relaxed block">{error}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Authorization Confirmed</span>
                <span className="text-[11px] leading-relaxed block">{successMsg}</span>
              </div>
            </div>
          )}

          {/* Zero-Trust Notice */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-stone-900">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Zero-Trust Server-Validated Identity</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Founder & Owner access is restricted to <strong>{OWNER_PROFILE.fullName}</strong> (
              <code className="text-amber-900 bg-amber-100/60 px-1 py-0.5 rounded font-mono">
                {OWNER_PROFILE.email}
              </code>
              ). Permissions are validated server-side against cryptographic Google Identity tokens.
            </p>
          </div>

          {/* Action Zone */}
          <div className="space-y-4 pt-1">
            {isConfigured ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  className="w-full py-3 px-4 bg-white hover:bg-stone-50 text-stone-800 border-2 border-stone-200 hover:border-stone-400 font-bold rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27a7.17 7.17 0 0 1 0-4.54V6.58H1.26a11.96 11.96 0 0 0 0 10.84l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>
                    {verificationStep === 'google_popup'
                      ? 'Waiting for Google Sign-In...'
                      : verificationStep === 'server_validating'
                      ? 'Verifying with Backend Server...'
                      : verificationStep === 'completed'
                      ? 'Owner Verified!'
                      : 'Sign in with Google as Owner'}
                  </span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Firebase Auth: <strong>cooknow-9444c</strong> (Active)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-stone-700">
                  <div className="flex items-center gap-1.5 font-bold text-stone-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Firebase Credentials Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Google Sign-In is configured on project{' '}
                    <code className="font-mono text-stone-900 bg-stone-200 px-1 py-0.5 rounded">
                      cooknow-9444c
                    </code>
                    . Add your Web App API key to activate Google Authentication:
                  </p>
                  <div className="font-mono text-[10px] bg-stone-900 text-stone-100 p-2.5 rounded-lg space-y-1">
                    <div>VITE_FIREBASE_API_KEY=&quot;AIzaSy...&quot;</div>
                    <div>VITE_FIREBASE_APP_ID=&quot;1:465197547970:web:...&quot;</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 bg-stone-100 text-stone-400 font-bold rounded-xl border border-stone-200 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Google Sign-In Inactive (Missing Key)</span>
                </button>

                <p className="text-[10px] text-stone-500 text-center">
                  Copy from Firebase Console &gt; Project Settings &gt; General &gt; Your apps &gt; Web app.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
