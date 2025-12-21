import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseKey) {
  // It's possible this runs during build where envs might be missing if not using strict env validation.
  // But we need them for runtime.
  console.warn('Supabase URL or Key missing');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadImage(base64Data: string, bucketPath: string): Promise<string> {
  // 1. Parse Base64
  // Expects data:image/xxx;base64,....
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }
  const type = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  // 2. Determine extension
  let ext = 'bin';
  if (type === 'image/jpeg') ext = 'jpg';
  else if (type === 'image/png') ext = 'png';
  else if (type === 'image/gif') ext = 'gif';
  else if (type === 'image/webp') ext = 'webp';
  else if (type === 'image/svg+xml') ext = 'svg';

  const fullPath = `${bucketPath}.${ext}`;

  // 3. Upload
  const { error } = await supabase.storage
    .from('images')
    .upload(fullPath, buffer, {
      contentType: type,
      upsert: true,
    });

  if (error) {
    console.error(`Supabase upload error for ${fullPath}:`, error);
    throw new Error('Failed to upload image to storage');
  }

  // 4. Get Public URL
  const { data: publicUrlData } = supabase.storage
    .from('images')
    .getPublicUrl(fullPath);

  return publicUrlData.publicUrl;
}
