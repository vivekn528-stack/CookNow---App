import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const getEnv = (key: string, fallback = '') => process.env[key] || env[key] || fallback;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(getEnv('VITE_FIREBASE_API_KEY')),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(getEnv('VITE_FIREBASE_APP_ID')),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(
        getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'cooknow-9444c.firebaseapp.com')
      ),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(
        getEnv('VITE_FIREBASE_PROJECT_ID', 'cooknow-9444c')
      ),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(
        getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'cooknow-9444c.firebasestorage.app')
      ),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(
        getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID')
      ),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(getEnv('VITE_SUPABASE_URL')),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(getEnv('VITE_SUPABASE_ANON_KEY')),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

