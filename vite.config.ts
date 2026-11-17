import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

function parsePublicEnvEntry(raw: string | undefined, targetKey: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const regex = new RegExp(`${targetKey}\\s*=\\s*([^\\s"']+)`);
  const match = trimmed.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  if (targetKey === 'SUPABASE_URL' || targetKey === 'VITE_SUPABASE_URL') {
    const urlMatch = trimmed.match(/https:\/\/[a-zA-Z0-9-]+\.supabase\.co/);
    if (urlMatch) return urlMatch[0];
  }
  if (!trimmed.includes(' ') && !trimmed.includes('=') && !trimmed.toLowerCase().includes('secret')) {
    return trimmed;
  }
  return '';
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const getVar = (name: string) => process.env[name] || fileEnv[name] || '';

  const rawUrl = getVar('VITE_SUPABASE_URL') || getVar('SUPABASE_URL');
  const rawPub =
    getVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getVar('SUPABASE_PUBLISHABLE_KEY') ||
    getVar('VITE_SUPABASE_ANON_KEY') ||
    getVar('SUPABASE_ANON_KEY');

  const cleanUrl =
    parsePublicEnvEntry(rawUrl, 'VITE_SUPABASE_URL') ||
    parsePublicEnvEntry(rawUrl, 'SUPABASE_URL') ||
    parsePublicEnvEntry(getVar('SUPABASE_URL'), 'SUPABASE_URL');

  const cleanPublishableKey =
    parsePublicEnvEntry(rawPub, 'VITE_SUPABASE_PUBLISHABLE_KEY') ||
    parsePublicEnvEntry(rawPub, 'SUPABASE_PUBLISHABLE_KEY') ||
    parsePublicEnvEntry(rawPub, 'VITE_SUPABASE_ANON_KEY') ||
    parsePublicEnvEntry(rawPub, 'SUPABASE_ANON_KEY') ||
    parsePublicEnvEntry(getVar('SUPABASE_URL'), 'SUPABASE_PUBLISHABLE_KEY') ||
    parsePublicEnvEntry(getVar('SUPABASE_URL'), 'SUPABASE_ANON_KEY');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(cleanUrl),
      'process.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(cleanPublishableKey),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(cleanUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(cleanPublishableKey),
    },
    optimizeDeps: {
      entries: ['index.html', 'src/main.tsx'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      ws: process.env.DISABLE_HMR === 'true' ? false : undefined,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              ignored: ['**/.backup-*/**', '**/data/**', '**/supabase/**', '**/dist/**'],
            },
    },
  };
});
