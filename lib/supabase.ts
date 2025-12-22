import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqfaqxxivvrjupyxxbbt.supabase.co';

// Do not hardcode secrets. Rely on process.env.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  // In a real app, we might throw, but to allow build without env vars (e.g. CI), we might warn.
  // However, functionality requiring this key will fail.
  console.warn('Missing SUPABASE_SERVICE_KEY, upload operations may fail.');
}

// Admin client with Service Role Key - capable of bypassing RLS and generating signed URLs
// We cast to string because createClient expects string, but we handled the check above.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const BUCKET_NAME = 'images';
