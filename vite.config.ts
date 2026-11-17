import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

function extractCleanSupabaseUrl(raw?: string): string {
  if (!raw) return '';
  const match = raw.match(/https:\/\/[a-zA-Z0-9-]+\.supabase\.co/);
  if (match) return match[0];
  if (raw.startsWith('https://') && !raw.includes(' ')) return raw.trim();
  return '';
}

function extractCleanPublishableKey(raw?: string): string {
  if (!raw) return '';
  const pubMatch = raw.match(/sb_publishable_[a-zA-Z0-9_-]+/);
  if (pubMatch) return pubMatch[0];
  const jwtMatch = raw.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
  if (jwtMatch && !raw.includes('SECRET')) return jwtMatch[0];
  if (!raw.includes(' ') && !raw.includes('=') && !raw.includes('secret')) return raw.trim();
  return '';
}

export default defineConfig(() => {
  const cleanUrl = extractCleanSupabaseUrl(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  );
  const cleanPublishableKey = extractCleanPublishableKey(
    process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_URL
  );

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(cleanUrl),
      'process.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(cleanPublishableKey),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(cleanUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(cleanPublishableKey),
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
