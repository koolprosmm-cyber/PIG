import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: getToken,
  });
}

// Unauthenticated client — only use in API routes that will use supabaseAdmin instead.
// Client components must use useSupabase() hook.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
