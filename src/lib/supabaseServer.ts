import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function parseEnvEntry(raw: string | undefined, targetKey: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // If user pasted multiple KEY=VALUE pairs into a single secret, extract the matching key safely
  const regex = new RegExp(`${targetKey}\\s*=\\s*([^\\s"']+)`);
  const match = trimmed.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  // If it does not contain spaces or other KEY= tokens, return as-is
  if (!trimmed.includes(' ') && !trimmed.includes('=')) {
    return trimmed;
  }
  return trimmed;
}

export function resolveSupabaseEnv() {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const rawPub =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  const rawSec =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const url = parseEnvEntry(rawUrl, 'SUPABASE_URL');
  const publishableKey =
    parseEnvEntry(rawPub, 'SUPABASE_PUBLISHABLE_KEY') ||
    parseEnvEntry(rawUrl, 'SUPABASE_PUBLISHABLE_KEY');
  const secretKey =
    parseEnvEntry(rawSec, 'SUPABASE_SECRET_KEY') ||
    parseEnvEntry(rawUrl, 'SUPABASE_SECRET_KEY');

  const rawUrlMalformed =
    !!rawUrl.trim() && (rawUrl.includes(' ') || rawUrl.includes('SUPABASE_'));

  return { url, publishableKey, secretKey, rawUrlMalformed };
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const { url, publishableKey, secretKey } = resolveSupabaseEnv();
  const key = secretKey || publishableKey;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function checkSupabaseStatus() {
  const { url, publishableKey, secretKey, rawUrlMalformed } = resolveSupabaseEnv();
  const hasUrl = !!url;
  const hasPublishableKey = !!publishableKey;
  const hasSecretKey = !!secretKey;

  // Never include raw env strings (which could contain secret tokens) in HTTP responses
  const safeUrl = (() => {
    try {
      return url ? new URL(url).origin : '';
    } catch {
      return '';
    }
  })();

  if (!hasUrl || !hasPublishableKey) {
    const missing: string[] = [];
    if (!hasUrl) missing.push('SUPABASE_URL');
    if (!hasPublishableKey) missing.push('SUPABASE_PUBLISHABLE_KEY');

    return {
      isConfigured: false,
      isConnected: false,
      envRecognized: {
        SUPABASE_URL: hasUrl,
        SUPABASE_PUBLISHABLE_KEY: hasPublishableKey,
        SUPABASE_SECRET_KEY: hasSecretKey,
      },
      url: safeUrl,
      hasKey: hasPublishableKey,
      hasSecretKey,
      errorMessage: `Variáveis de ambiente não reconhecidas/ausentes no servidor: ${missing.join(', ')}.`,
      fileToFix: '.env ou painel Secrets do ambiente',
    };
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return {
      isConfigured: false,
      isConnected: false,
      envRecognized: {
        SUPABASE_URL: hasUrl,
        SUPABASE_PUBLISHABLE_KEY: hasPublishableKey,
        SUPABASE_SECRET_KEY: hasSecretKey,
      },
      url: safeUrl,
      hasKey: hasPublishableKey,
      hasSecretKey,
      errorMessage: 'SUPABASE_URL inválida. Deve ser apenas a URL https://<projeto>.supabase.co',
      fileToFix: 'Secrets do ambiente (SUPABASE_URL)',
    };
  }

  const client = createClient(url, secretKey || publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const tablesToCheck = [
    'profiles',
    'categories',
    'products',
    'product_images',
    'addresses',
    'favorites',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'stock_movements',
    'plating_services',
  ];

  const tablesFound: string[] = [];
  const tableErrors: Record<string, { code?: string; message: string }> = {};

  try {
    for (const table of tablesToCheck) {
      const { error } = await client
        .from(table)
        .select('*')
        .limit(1);

      if (!error) {
        tablesFound.push(table);
      } else {
        tableErrors[table] = {
          code: error.code,
          message: error.message,
        };
      }
    }

    const sampleError = Object.values(tableErrors)[0];
    const isTableMissingError = (err?: { code?: string; message: string }) => {
      if (!err) return false;
      const msg = (err.message || '').toLowerCase();
      return (
        err.code === 'PGRST205' ||
        err.code === '42P01' ||
        msg.includes('could not find the table') ||
        msg.includes('relation') ||
        msg.includes('does not exist')
      );
    };

    const envWarning = rawUrlMalformed
      ? 'Aviso: A variável SUPABASE_URL nos Secrets contém múltiplas variáveis coladas juntas (incluindo chaves). Corrija no painel Secrets para conter apenas https://<seu-projeto>.supabase.co.'
      : undefined;

    if (tablesFound.length > 0) {
      const sampleTable = tablesFound.includes('categories') ? 'categories' : tablesFound[0];
      const { data: sampleRows, error: queryErr } = await client
        .from(sampleTable)
        .select('*')
        .limit(5);

      return {
        isConfigured: true,
        isConnected: true,
        schemaInitialized: true,
        envRecognized: {
          SUPABASE_URL: hasUrl,
          SUPABASE_PUBLISHABLE_KEY: hasPublishableKey,
          SUPABASE_SECRET_KEY: hasSecretKey,
        },
        envWarning,
        url: safeUrl,
        hasKey: hasPublishableKey,
        hasSecretKey,
        tablesFound,
        tablesMissing: tablesToCheck.filter((t) => !tablesFound.includes(t)),
        sampleQuery: {
          table: sampleTable,
          rowCount: sampleRows?.length ?? 0,
          rowsPreview: sampleRows ?? [],
          error: queryErr?.message || null,
        },
      };
    }

    if (sampleError && isTableMissingError(sampleError)) {
      return {
        isConfigured: true,
        isConnected: true,
        schemaInitialized: false,
        envRecognized: {
          SUPABASE_URL: hasUrl,
          SUPABASE_PUBLISHABLE_KEY: hasPublishableKey,
          SUPABASE_SECRET_KEY: hasSecretKey,
        },
        envWarning,
        url: safeUrl,
        hasKey: hasPublishableKey,
        hasSecretKey,
        tablesFound: [],
        tablesMissing: tablesToCheck,
        sampleQuery: {
          table: 'categories',
          errorCode: tableErrors['categories']?.code || sampleError.code,
          error: tableErrors['categories']?.message || sampleError.message,
        },
        errorMessage:
          'Conexão com o Supabase estabelecida, porém nenhuma das tabelas do projeto foi encontrada no banco de dados ainda.',
        fileToFix: 'supabase/schema.sql (executar no Supabase Dashboard > SQL Editor)',
      };
    }

    return {
      isConfigured: true,
      isConnected: false,
      envRecognized: {
        SUPABASE_URL: hasUrl,
        SUPABASE_PUBLISHABLE_KEY: hasPublishableKey,
        SUPABASE_SECRET_KEY: hasSecretKey,
      },
      envWarning,
      url: safeUrl,
      hasKey: hasPublishableKey,
      hasSecretKey,
      tablesFound: [],
      tablesMissing: tablesToCheck,
      errorMessage: sampleError?.message || 'Erro ao consultar o Supabase.',
      errorCode: sampleError?.code,
      fileToFix: 'Secrets / .env (verifique SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e SUPABASE_SECRET_KEY)',
    };
  } catch (error: any) {
    return {
      isConfigured: true,
      isConnected: false,
      envRecognized: {
        SUPABASE_URL: hasUrl,
        SUPABASE_PUBLISHABLE_KEY: hasPublishableKey,
        SUPABASE_SECRET_KEY: hasSecretKey,
      },
      envWarning: rawUrlMalformed
        ? 'Aviso: A variável SUPABASE_URL contém múltiplas variáveis coladas juntas.'
        : undefined,
      url: safeUrl,
      hasKey: hasPublishableKey,
      hasSecretKey,
      errorMessage: error?.message || 'Falha na conexão de rede com o Supabase.',
      fileToFix: 'src/lib/supabaseServer.ts ou Secrets',
    };
  }
}
