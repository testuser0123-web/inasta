import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqfaqxxivvrjupyxxbbt.supabase.co';
// We use the Service Role Key for server-side operations to bypass RLS/Auth policies
// since we are handling authentication via Stack Auth (not Supabase Auth).
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Uploads will fail.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || 'placeholder-key', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
