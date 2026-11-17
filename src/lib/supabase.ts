import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Detect password recovery redirect before Supabase Auth strips the URL hash
let pendingRecoveryFromUrl =
  typeof window !== 'undefined' &&
  (window.location.hash.includes('type=recovery') ||
    window.location.search.includes('type=recovery'));

export const consumePendingPasswordRecovery = (): boolean => {
  const value = pendingRecoveryFromUrl;
  pendingRecoveryFromUrl = false;
  return value;
};

// Resolve configuration from Vite build-time env, Node process.env, or window config
export const getSupabaseConfig = () => {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : '') ||
    (typeof window !== 'undefined' ? (window as any).__SUPABASE_URL__ : '') ||
    '';

  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined'
      ? process.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env?.SUPABASE_PUBLISHABLE_KEY ||
        process.env?.SUPABASE_ANON_KEY
      : '') ||
    (typeof window !== 'undefined' ? (window as any).__SUPABASE_PUBLISHABLE_KEY__ : '') ||
    '';

  return {
    url: typeof url === 'string' ? url.trim() : '',
    publishableKey: typeof publishableKey === 'string' ? publishableKey.trim() : '',
  };
};

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined';

function buildSupabaseClient(url: string, publishableKey: string): SupabaseClient | null {
  if (!isBrowser()) {
    return null;
  }

  const client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      pendingRecoveryFromUrl = true;
    }
  });

  return client;
}

let cachedClient: SupabaseClient | null = null;
if (isBrowser()) {
  const initialConfig = getSupabaseConfig();
  if (initialConfig.url && initialConfig.publishableKey) {
    cachedClient = buildSupabaseClient(initialConfig.url, initialConfig.publishableKey);
  }
}

export const supabase: SupabaseClient | null = cachedClient;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isBrowser()) return null;
  if (cachedClient) return cachedClient;
  const { url, publishableKey } = getSupabaseConfig();
  if (url && publishableKey) {
    cachedClient = buildSupabaseClient(url, publishableKey);
    return cachedClient;
  }
  return null;
};

let pendingClientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Guarantees a singleton Supabase browser client, falling back to the backend's
 * public runtime configuration endpoint (/api/supabase/public-config) if Vite
 * build-time VITE_* variables were not embedded (common in Netlify deployments).
 */
export const ensureSupabaseClient = async (): Promise<SupabaseClient | null> => {
  if (!isBrowser()) return null;
  const existing = getSupabaseClient();
  if (existing) return existing;

  if (!pendingClientPromise) {
    pendingClientPromise = (async () => {
      try {
        const res = await fetch('/api/supabase/public-config', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json().catch(() => ({}));
        if (data?.url && data?.publishableKey) {
          cachedClient = buildSupabaseClient(
            String(data.url).trim(),
            String(data.publishableKey).trim()
          );
          return cachedClient;
        }
      } catch {
        // Non-fatal; caller surfaces configuration error
      } finally {
        pendingClientPromise = null;
      }
      return null;
    })();
  }

  return pendingClientPromise;
};

// Check connection health against Supabase
export interface SupabaseConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  url: string;
  hasKey: boolean;
  errorMessage?: string;
  tablesFound?: string[];
}

export const testSupabaseConnection = async (): Promise<SupabaseConnectionStatus> => {
  try {
    const res = await fetch('/api/supabase/status');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend supabase status check failed, trying direct client:', err);
  }

  const client = await ensureSupabaseClient();
  const { url, publishableKey } = getSupabaseConfig();

  if (!client || !url || !publishableKey) {
    return {
      isConfigured: false,
      isConnected: false,
      url: url || '',
      hasKey: !!publishableKey,
      errorMessage: 'Variáveis SUPABASE_URL ou SUPABASE_PUBLISHABLE_KEY não informadas.',
    };
  }

  try {
    // Attempt reading categories (which has public select RLS policy)
    const { data, error } = await client.from('categories').select('id, name').limit(1);
    if (error) {
      return {
        isConfigured: true,
        isConnected: false,
        url,
        hasKey: true,
        errorMessage: error.message,
      };
    }
    return {
      isConfigured: true,
      isConnected: true,
      url,
      hasKey: true,
      tablesFound: ['categories'],
    };
  } catch (error: any) {
    return {
      isConfigured: true,
      isConnected: false,
      url,
      hasKey: true,
      errorMessage: error?.message || 'Falha ao conectar com o Supabase.',
    };
  }
};
