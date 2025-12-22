'use server';

import { supabaseAdmin, BUCKET_NAME } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function getSignedUploadUrl(fileName: string, folder: string = 'misc') {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  // Sanitize filename
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
  // Construct path: folder/userId/uuid-filename
  // This ensures users don't overwrite each other's files
  const path = `${folder}/${session.id}/${uuidv4()}-${cleanFileName}`;

  // Generate Signed Upload URL
  const { data, error } = await supabaseAdmin
    .storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(path);

  if (error) {
    console.error('Error generating signed url:', error);
    throw new Error('Failed to generate upload URL');
  }

  // Construct the public URL (assuming the bucket is public or we want to access it publicly)
  // The user said "anon has select rights", so it is public for reading.
  const { data: publicUrlData } = supabaseAdmin
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return {
    signedUrl: data.signedUrl,
    path: path,
    publicUrl: publicUrlData.publicUrl
  };
}
