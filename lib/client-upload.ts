
import { getSignedUploadUrl } from '@/app/actions/storage';

/**
 * Uploads a file to Supabase Storage using a signed URL.
 *
 * @param file The file to upload
 * @param folder The folder to organize the file in (e.g., 'posts', 'avatars', 'diaries')
 * @returns The public URL of the uploaded file
 */
export async function uploadImageToSupabase(file: File, folder: string = 'misc'): Promise<string> {
  try {
    // 1. Get Signed URL from Server
    const { signedUrl, publicUrl } = await getSignedUploadUrl(file.name, folder);

    // 2. Upload to Supabase using the signed URL
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    // 3. Return the public URL
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}
