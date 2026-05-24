
import { getSignedUploadUrl } from '@/app/actions/storage';

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('画像を読み込めませんでした。'));
    };
    image.src = objectUrl;
  });
}

async function decodeCustomEmojiImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    return loadImageElement(file);
  }
}

/**
 * Uploads a file to Supabase Storage using a signed URL.
 *
 * @param file The file to upload
 * @param folder The folder to organize the file in (e.g., 'posts', 'avatars', 'diaries')
 * @returns The public URL of the uploaded file
 */
export async function uploadImageToSupabase(file: File, folder: string = 'misc'): Promise<string> {
  const { publicUrl } = await uploadFileToSupabase(file, folder);
  return publicUrl;
}

export async function uploadFileToSupabase(file: File, folder: string = 'misc'): Promise<{ publicUrl: string; path: string }> {
  try {
    // 1. Get Signed URL from Server
    const { signedUrl, publicUrl, path } = await getSignedUploadUrl(file.name, folder);

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

    // 3. Return the object storage public URL and storage path
    return { publicUrl, path };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function prepareCustomEmojiUpload(file: File): Promise<{ file: File; width: 128; height: 128; mimeType: 'image/webp' }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください。');
  }

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await decodeCustomEmojiImage(file);
  } catch {
    throw new Error('画像を読み込めませんでした。');
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像を処理できませんでした。');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scaleX = canvas.width / bitmap.width;
  const scaleY = canvas.height / bitmap.height;
  const scale = Math.min(scaleX, scaleY);
  const drawWidth = Math.max(1, Math.round(bitmap.width * scale));
  const drawHeight = Math.max(1, Math.round(bitmap.height * scale));
  const dx = Math.round((canvas.width - drawWidth) / 2);
  const dy = Math.round((canvas.height - drawHeight) / 2);
  ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight);
  if ('close' in bitmap) {
    bitmap.close();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('絵文字画像を生成できませんでした。')), 'image/webp', 0.92);
  });

  return {
    file: new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'custom-emoji'}.webp`, { type: 'image/webp' }),
    width: 128,
    height: 128,
    mimeType: 'image/webp',
  };
}

export async function uploadCustomEmojiImage(file: File): Promise<{ publicUrl: string; storagePath: string; width: 128; height: 128; mimeType: 'image/webp' }> {
  const prepared = await prepareCustomEmojiUpload(file);
  const { publicUrl, path } = await uploadFileToSupabase(prepared.file, 'custom-emojis');
  return {
    publicUrl,
    storagePath: path,
    width: prepared.width,
    height: prepared.height,
    mimeType: prepared.mimeType,
  };
}
