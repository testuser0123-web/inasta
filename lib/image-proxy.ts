import { list } from '@vercel/blob';

export async function fetchWithFallback(imageUrl: string): Promise<Response | null> {
  // 1. Try fetching the original URL
  let response: Response | null = null;
  try {
    response = await fetch(imageUrl);
  } catch (error) {
    console.error('Error fetching image from URL:', error);
  }

  // 2. If valid response, return it
  if (response && response.ok) {
    return response;
  }

  // 3. Fallback: Try Vercel Blob using SDK
  try {
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname.substring(1); // Remove leading slash

    const { blobs } = await list({
      prefix: pathname,
      limit: 1,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (blobs.length > 0) {
      const blobResponse = await fetch(blobs[0].url, { cache: 'no-store' });
      if (blobResponse.ok) {
        return blobResponse;
      }
    }
  } catch (error) {
    console.error('Error fetching image from Vercel Blob fallback:', error);
  }

  // 4. Return null if fallback also failed (or original failure if no fallback possible)
  // If original response exists (but !ok), return it? No, we want to hide upstream errors if we are trying fallback.
  // But if fallback fails, we should probably return 404.
  return null;
}
