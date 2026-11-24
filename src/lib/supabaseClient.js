import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isValidSupabaseUrl = /^https:\/\/[^\s/]+\.supabase\.co(?:\/[^\s]*)?$/.test(supabaseUrl);
const isPlaceholderKey = !supabaseAnonKey
  || supabaseAnonKey.includes('your-anon-key')
  || supabaseAnonKey.includes('placeholder')
  || supabaseAnonKey.includes('your-project');

// True when real credentials are present in .env
export const isSupabaseConfigured = Boolean(
  isValidSupabaseUrl && !isPlaceholderKey,
);

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  : !isValidSupabaseUrl
    ? 'Invalid VITE_SUPABASE_URL. Use your Supabase Project URL from Settings → API.'
    : isPlaceholderKey
      ? 'VITE_SUPABASE_ANON_KEY is still a placeholder. Use the anon/publishable key, not the service-role key.'
      : null;

// createClient() throws on an empty URL, so fall back to a placeholder that
// keeps the app bootable (landing page + offline play) until .env is filled in.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
);
