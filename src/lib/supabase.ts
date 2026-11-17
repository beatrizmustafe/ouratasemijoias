import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Resolve configuration from Vite import.meta.env, process.env, or window config
export const getSupabaseConfig = () => {
  const env = (import.meta as any).env || {};
  const procEnv = (typeof process !== 'undefined' && process.env) || {};
  const win = typeof window !== 'undefined' ? (window as any) : {};

  const url =
    env.VITE_SUPABASE_URL ||
    procEnv.VITE_SUPABASE_URL ||
    procEnv.SUPABASE_URL ||
    win.__SUPABASE_URL__ ||
    '';

  const publishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    procEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
    procEnv.SUPABASE_PUBLISHABLE_KEY ||
    procEnv.SUPABASE_ANON_KEY ||
    win.__SUPABASE_PUBLISHABLE_KEY__ ||
    '';

  return { url, publishableKey };
};

const config = getSupabaseConfig();

// Safe initialization of client
export const supabase: SupabaseClient | null =
  config.url && config.publishableKey
    ? createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

// Centralized helper to get or reinitialize client dynamically
export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabase) return supabase;
  const { url, publishableKey } = getSupabaseConfig();
  if (url && publishableKey) {
    return createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return null;
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

  const client = getSupabaseClient();
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
