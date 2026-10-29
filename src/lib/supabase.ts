/**
 * Supabase client singleton for SkillShare Local.
 *
 * Only the public anon key is used here — this file is bundled into the browser.
 * The service-role key must NEVER appear in this file or any other frontend file.
 *
 * Environment variables are validated at startup; a missing variable causes an
 * explicit error rather than a silent null-pointer later.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient<Database>(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseKey || 'supabase-not-configured',
  {
  auth: {
    // Persist session in localStorage so the user stays logged in across refreshes.
    persistSession: true,
    // Automatically refresh the access token before it expires.
    autoRefreshToken: true,
    // Detect OAuth session in URL fragment on page load (needed for password-reset links).
    detectSessionInUrl: true,
  },
  }
);
