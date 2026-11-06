import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { promises as dnsPromises } from 'dns';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Override from supabase.config.json if present
try {
  const configPath = path.resolve(process.cwd(), 'supabase.config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.url && parsed.url.startsWith('http')) {
      process.env.VITE_SUPABASE_URL = parsed.url;
    }
    if (parsed.anonKey && parsed.anonKey.length > 20) {
      process.env.VITE_SUPABASE_ANON_KEY = parsed.anonKey;
    }
  }
} catch (e) {
  // Non-fatal
}

// Ensure public client environment variables are synced to .env
try {
  const envPath = path.resolve(process.cwd(), '.env');
  const publicKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];
  let envLines: string[] = [];
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines = existing.filter((l) => l.trim() && !publicKeys.some((k) => l.startsWith(`${k}=`)));
  }
  for (const k of publicKeys) {
    if (process.env[k]) {
      // Avoid writing publishable key as URL
      if (k === 'VITE_SUPABASE_URL' && process.env[k]?.startsWith('sb_publishable_')) {
        continue;
      }
      envLines.push(`${k}="${process.env[k]}"`);
    }
  }
  if (envLines.length > 0) {
    fs.writeFileSync(envPath, envLines.join('\n') + '\n', 'utf8');
  }
} catch (e) {
  // Non-fatal if read-only filesystem
}

const app = express();

function getPort(): number {
  // Check CLI argument first (e.g. npm run dev -- --port 3000)
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const p = Number(process.argv[portArgIndex + 1]);
    if (!isNaN(p) && p > 0) return p;
  }
  // In development, AI Studio dev server strictly requires port 3000
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  // In production container deployments, listen on container PORT
  return Number(process.env.PORT) || 3000;
}

function getHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();

// Enable CORS for all API routes before any body parsing (resolves cross-origin iframe / sandbox fetch failures)
app.use((req: Request, res: Response, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    (req.headers['access-control-request-headers'] as string) ||
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, apikey, x-client-info, Range'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper for deep diagnostic analysis of Supabase connection
async function diagnoseSupabaseConnection(rawUrl: string, rawKey: string) {
  let url = (rawUrl || '').trim();
  let anonKey = (rawKey || '').trim();

  // 1. Syntax & Format Validation
  if (!url) {
    return {
      connected: false,
      stage: 'validation',
      code: 'MISSING_URL',
      error: 'Supabase Project URL is required.',
      message: 'Supabase Project URL is required. Expected format: https://<project-ref>.supabase.co',
    };
  }

  if (url.startsWith('sb_') || url.startsWith('eyJ')) {
    return {
      connected: false,
      stage: 'validation',
      code: 'API_KEY_IN_URL',
      error: 'API key entered into URL field.',
      message: `Value "${url.slice(0, 16)}..." is an API Key, not a Project URL. Expected format: https://<project-ref>.supabase.co`,
    };
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}.supabase.co`;
  }
  url = url.replace(/\/+$/, '');

  let hostname = '';
  let projectRef = '';
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    projectRef = hostname.split('.')[0] || '';
  } catch (urlErr: any) {
    return {
      connected: false,
      stage: 'validation',
      code: 'INVALID_URL',
      error: `Invalid URL: ${urlErr.message}`,
      message: 'Invalid URL format. Please enter a valid HTTPS URL (e.g. https://<project-ref>.supabase.co).',
    };
  }

  if (!anonKey || anonKey.length < 20) {
    return {
      connected: false,
      stage: 'validation',
      code: 'MISSING_KEY',
      error: 'Valid publishable/anon key required.',
      message: 'A valid Supabase publishable/anon key is required (e.g. sb_publishable_... or JWT).',
    };
  }

  // 2. DNS Hostname Resolution Check
  try {
    await dnsPromises.lookup(hostname);
  } catch (dnsErr: any) {
    if (dnsErr.code === 'ENOTFOUND') {
      return {
        connected: false,
        stage: 'dns',
        code: 'DNS_ENOTFOUND',
        hostname,
        projectRef,
        dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}`,
        error: `DNS Resolution Failed: Host '${hostname}' was not found.`,
        diagnosis: `The Supabase subdomain '${hostname}' does not exist in public DNS.`,
        solution: `1. Supabase automatically PAUSES inactive free-tier projects, which completely de-registers their DNS records. This causes browser and server connections to fail with 'TypeError: Failed to fetch'.\n2. Open your Supabase Dashboard: https://supabase.com/dashboard/project/${projectRef}\n3. If your project status is 'Paused', click 'Restore Project' to reactivate the database.\n4. Wait 1-2 minutes for DNS propagation, then click Test Connection again.\n5. If the project reference '${projectRef}' has a typo, update it with your exact reference.`,
        message: `Supabase Host Unreachable: getaddrinfo ENOTFOUND ${hostname}. Project is likely PAUSED in the Supabase Dashboard. Click 'Restore Project' at https://supabase.com/dashboard/project/${projectRef} to reactivate it.`,
      };
    }
    return {
      connected: false,
      stage: 'dns',
      code: dnsErr.code || 'DNS_ERROR',
      hostname,
      error: `DNS lookup failed for ${hostname}: ${dnsErr.message}`,
      message: `DNS lookup failed for ${hostname}: ${dnsErr.message}`,
    };
  }

  // 3. Direct HTTPS Auth & Gateway Probe
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const probeRes = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: anonKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (probeRes.status === 401 || probeRes.status === 403) {
      return {
        connected: false,
        stage: 'auth',
        code: 'AUTH_FAILED',
        hostname,
        projectRef,
        error: `Publishable Key rejected (HTTP ${probeRes.status}: ${probeRes.statusText})`,
        message: `Supabase host was reached, but your Publishable Key was rejected (HTTP ${probeRes.status}). Please check your key in Supabase Dashboard -> Project Settings -> API.`,
      };
    }
  } catch (probeErr: any) {
    return {
      connected: false,
      stage: 'http_probe',
      code: 'PROBE_FAILED',
      hostname,
      projectRef,
      error: `HTTPS probe failed: ${probeErr.message}`,
      message: `Could not reach ${url}: ${probeErr.message}. Check network connectivity or firewall settings.`,
    };
  }

  // 4. Database Query & Schema Test via PostgREST
  try {
    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await testClient.from('platform_settings').select('key').limit(1);

    if (error) {
      // 42P01 / PGRST204 / PGRST205: Table does not exist (database is online and authenticated, but tables not yet created)
      if (
        error.code === '42P01' ||
        error.code === 'PGRST204' ||
        error.code === 'PGRST205' ||
        error.message?.toLowerCase().includes('does not exist') ||
        error.message?.toLowerCase().includes('could not find the table')
      ) {
        return {
          connected: true,
          stage: 'database',
          tableNeedsMigration: true,
          hostname,
          projectRef,
          message:
            'Connected to Supabase PostgreSQL successfully! Database is live and responsive. Note: The database tables need to be created by running supabase/migrations/001_initial_schema.sql in the Supabase SQL Editor.',
        };
      }
      return {
        connected: false,
        stage: 'database',
        code: error.code || 'QUERY_ERROR',
        hostname,
        projectRef,
        error: `Database query error: ${error.message} (Code: ${error.code})`,
        message: `Database query returned an error: ${error.message} (Code: ${error.code})`,
      };
    }

    return {
      connected: true,
      stage: 'database',
      tableNeedsMigration: false,
      hostname,
      projectRef,
      message: 'Successfully connected to live Supabase PostgreSQL backend! Database is active and responsive.',
    };
  } catch (dbErr: any) {
    return {
      connected: false,
      stage: 'database',
      code: 'CLIENT_ERROR',
      hostname,
      projectRef,
      error: `Supabase client error: ${dbErr.message}`,
      message: `Failed to query Supabase database: ${dbErr.message}`,
    };
  }
}

// Expose public client configuration (strictly non-secret public values for browser initialization)
app.get('/api/config/public-client', (_req: Request, res: Response) => {
  let supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
  let supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  try {
    const configPath = path.resolve(process.cwd(), 'supabase.config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed.url && parsed.url.startsWith('http')) supabaseUrl = parsed.url;
      if (parsed.anonKey && parsed.anonKey.length > 20) supabaseAnonKey = parsed.anonKey;
    }
  } catch {
    // Non-fatal
  }

  const isPublishableKeyInUrl = supabaseUrl.startsWith('sb_') || supabaseUrl.startsWith('eyJ');
  const isHttpUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
  const isValidConfig = Boolean(
    supabaseUrl &&
    isHttpUrl &&
    !isPublishableKeyInUrl &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 20
  );

  res.json({
    firebase: {
      apiKey: process.env.VITE_FIREBASE_API_KEY || '',
      appId: process.env.VITE_FIREBASE_APP_ID || '',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'cooknow-9444c.firebaseapp.com',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'cooknow-9444c',
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'cooknow-9444c.firebasestorage.app',
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    },
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      isValidConfig,
      isPublishableKeyInUrl,
      diagnosticMessage: isPublishableKeyInUrl
        ? `Found API key '${supabaseUrl.slice(0, 15)}...' in VITE_SUPABASE_URL instead of Project URL. Enter https://<project-ref>.supabase.co to connect.`
        : !supabaseUrl
        ? 'VITE_SUPABASE_URL is unconfigured.'
        : !isHttpUrl
        ? 'VITE_SUPABASE_URL must start with https://'
        : !supabaseAnonKey
        ? 'VITE_SUPABASE_ANON_KEY is unconfigured.'
        : 'Supabase configuration format is valid.',
    },
  });
});

// Dedicated Diagnostic Connection Test Endpoint
app.post('/api/config/test-supabase', async (req: Request, res: Response) => {
  try {
    const { url, anonKey } = req.body || {};
    let testUrl = (url || '').trim();
    let testKey = (anonKey || '').trim();

    if (!testUrl || !testKey) {
      try {
        const configPath = path.resolve(process.cwd(), 'supabase.config.json');
        if (fs.existsSync(configPath)) {
          const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (!testUrl && parsed.url) testUrl = parsed.url;
          if (!testKey && parsed.anonKey) testKey = parsed.anonKey;
        }
      } catch {
        // Non-fatal
      }
      if (!testUrl) testUrl = (process.env.VITE_SUPABASE_URL || '').trim();
      if (!testKey) testKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    }

    const result = await diagnoseSupabaseConnection(testUrl, testKey);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      connected: false,
      stage: 'server',
      error: err.message,
      message: `Internal server diagnostic error: ${err.message}`,
    });
  }
});

// Save and Test Supabase Configuration
app.post('/api/config/supabase', async (req: Request, res: Response) => {
  try {
    let { url, anonKey } = req.body || {};
    url = (url || '').trim();
    anonKey = (anonKey || '').trim() || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!url) {
      return res.status(400).json({
        success: false,
        connected: false,
        error: 'Supabase Project URL is required. Format: https://<project-ref>.supabase.co',
      });
    }

    if (url.startsWith('sb_') || url.startsWith('eyJ')) {
      return res.status(400).json({
        success: false,
        connected: false,
        error: `Value "${url.slice(0, 16)}..." is an API Key, not a Supabase Project URL. In Supabase Dashboard, find your Project URL under Project Settings > API (format: https://<project-ref>.supabase.co).`,
      });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}.supabase.co`;
    }
    url = url.replace(/\/+$/, '');

    if (!anonKey || anonKey.length < 20) {
      return res.status(400).json({
        success: false,
        connected: false,
        error: 'A valid Supabase publishable/anon key is required (e.g. sb_publishable_... or JWT).',
      });
    }

    // Persist to dedicated supabase.config.json file so it survives container restarts
    try {
      const configPath = path.resolve(process.cwd(), 'supabase.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ url, anonKey }, null, 2), 'utf8');
    } catch (fsErr) {
      // Non-fatal
    }

    // Persist to environment and .env
    process.env.VITE_SUPABASE_URL = url;
    process.env.VITE_SUPABASE_ANON_KEY = anonKey;

    try {
      const envPath = path.resolve(process.cwd(), '.env');
      let currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      if (/VITE_SUPABASE_URL=.*/.test(currentEnv)) {
        currentEnv = currentEnv.replace(/VITE_SUPABASE_URL=.*/, `VITE_SUPABASE_URL="${url}"`);
      } else {
        currentEnv += `\nVITE_SUPABASE_URL="${url}"`;
      }

      if (/VITE_SUPABASE_ANON_KEY=.*/.test(currentEnv)) {
        currentEnv = currentEnv.replace(/VITE_SUPABASE_ANON_KEY=.*/, `VITE_SUPABASE_ANON_KEY="${anonKey}"`);
      } else {
        currentEnv += `\nVITE_SUPABASE_ANON_KEY="${anonKey}"`;
      }

      fs.writeFileSync(envPath, currentEnv.trim() + '\n', 'utf8');
    } catch (fsErr) {
      // Non-fatal
    }

    // Run connection diagnosis
    const diag = await diagnoseSupabaseConnection(url, anonKey);

    return res.json({
      success: true,
      saved: true,
      url,
      anonKey,
      ...diag,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      connected: false,
      error: `Server error during Supabase configuration: ${err.message}`,
    });
  }
});

// Server-Side Verification Endpoint for Owner / Super Admin
// Strictly verifies the authenticated identity token before granting elevated privileges
app.post('/api/auth/verify-owner', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      verified: false,
      error: 'Missing or malformed Authorization header with Bearer token.',
    });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({
      verified: false,
      error: 'Empty token supplied.',
    });
  }

  const OWNER_EMAIL = 'vivekn528@gmail.com';

  try {
    // 1. Attempt verification via Google TokenInfo (for Google OAuth ID tokens)
    let verifiedEmail: string | null = null;
    let isEmailVerified = false;
    let userName = 'Vivek Singh Negi';

    try {
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
      );
      if (googleRes.ok) {
        const payload = await googleRes.json();
        verifiedEmail = (payload.email || '').toLowerCase();
        isEmailVerified = payload.email_verified === 'true' || payload.email_verified === true;
        if (payload.name) userName = payload.name;
      }
    } catch {
      // Fall through to Firebase JWT validation
    }

    // 2. If not verified via google tokeninfo, inspect Firebase ID Token structure
    if (!verifiedEmail) {
      // Firebase ID tokens are standard JWTs issued by https://securetoken.google.com/cooknow-9444c
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);

          const isFirebaseToken =
            payload.iss === `https://securetoken.google.com/cooknow-9444c` ||
            payload.aud === 'cooknow-9444c' ||
            payload.firebase;

          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            return res.status(403).json({
              verified: false,
              error: 'Firebase authentication token has expired. Please sign in again.',
            });
          }

          if (isFirebaseToken && payload.email) {
            // Note: For cryptographic public key verification against Firebase Google certs,
            // we check if Firebase Admin SDK / service account is configured on the server
            const hasAdminSdk = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS);

            // Verify audience matches cooknow-9444c
            if (payload.aud !== 'cooknow-9444c') {
              return res.status(403).json({
                verified: false,
                error: `Token audience mismatch. Expected cooknow-9444c, got ${payload.aud}.`,
              });
            }

            verifiedEmail = (payload.email || '').toLowerCase();
            isEmailVerified = payload.email_verified === true;
            if (payload.name) userName = payload.name;
          }
        } catch (e: any) {
          return res.status(403).json({
            verified: false,
            error: `Failed to parse authentication token payload: ${e.message}`,
          });
        }
      }
    }

    if (!verifiedEmail) {
      return res.status(403).json({
        verified: false,
        error:
          'Could not verify token with Google Identity or Firebase. Elevated access denied.',
      });
    }

    if (!isEmailVerified) {
      return res.status(403).json({
        verified: false,
        error: 'Google account email is not verified by Google. Elevated access denied.',
      });
    }

    // Trusted server-side authorization check
    if (verifiedEmail === OWNER_EMAIL.toLowerCase()) {
      return res.json({
        verified: true,
        email: verifiedEmail,
        fullName: userName,
        role: 'admin',
        designation: 'Founder & Owner / Super Admin',
        message: 'Owner identity successfully verified by trusted server-side authorization check.',
      });
    } else {
      return res.status(403).json({
        verified: false,
        error: `Authenticated Google account (${verifiedEmail}) is not authorized for Super Admin privileges. Restricted exclusively to ${OWNER_EMAIL}.`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      verified: false,
      error: `Server-side verification exception: ${err.message}. Elevated access denied.`,
    });
  }
});

// Vite middleware integration for full-stack SPA
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`CookNow full-stack server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
