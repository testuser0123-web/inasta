'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function uploadFile(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const file = formData.get('file') as File;
  const pathPrefix = formData.get('pathPrefix') as string || 'uploads';

  if (!file) {
    throw new Error('No file provided');
  }

  const timestamp = Date.now();
  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${pathPrefix}/${session.id}/${timestamp}-${safeName}`;

  // Read file as ArrayBuffer for Supabase upload
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabaseAdmin.storage
    .from('images')
    .upload(path, fileBuffer, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Upload failed');
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('images')
    .getPublicUrl(path);

  return { url: publicUrl };
}
