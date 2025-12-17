
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: ReturnType<typeof createClient> | undefined;
  // eslint-disable-next-line no-var
  var __supabaseAdminClient: ReturnType<typeof createClient> | undefined;
}

export const supabase = globalThis.__supabaseClient ?? createClient(supabaseUrl, supabaseKey);
globalThis.__supabaseClient = supabase;

const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  globalThis.__supabaseAdminClient ??
  (serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : supabase);

globalThis.__supabaseAdminClient = supabaseAdmin;
