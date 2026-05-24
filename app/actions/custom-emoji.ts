'use server';

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { normalizeCustomEmojiName } from '@/lib/reactions';

const ALLOWED_CUSTOM_EMOJI_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);

const CUSTOM_EMOJI_CACHE_TAG = 'custom-emojis';
const MAX_CUSTOM_EMOJI_URL_LENGTH = 2048;
const CUSTOM_EMOJI_SIZE = 128;

const getCachedCustomEmojis = unstable_cache(
  async () => db.customEmoji.findMany({
    where: { isActive: true },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      imageUrl: true,
      width: true,
      height: true,
    },
  }),
  ['custom-emojis:list'],
  { tags: [CUSTOM_EMOJI_CACHE_TAG], revalidate: 300 }
);

export async function fetchCustomEmojis() {
  return getCachedCustomEmojis();
}

export async function createCustomEmoji(input: {
  name: string;
  imageUrl: string;
  storagePath: string;
  mimeType: string;
  width: number;
  height: number;
}) {
  const session = await getSession();
  if (!session) {
    return { success: false, message: 'ログインが必要です。' };
  }

  let name: string;
  try {
    name = normalizeCustomEmojiName(input.name);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '絵文字名が不正です。' };
  }

  const imageUrl = input.imageUrl.trim();
  if (!imageUrl || imageUrl.length > MAX_CUSTOM_EMOJI_URL_LENGTH || !/^https?:\/\//.test(imageUrl) || imageUrl.startsWith('data:image') || imageUrl.includes('base64')) {
    return { success: false, message: '画像はオブジェクトストレージにアップロードされたURLだけ使えます。' };
  }

  const storagePath = input.storagePath.trim();
  if (!storagePath.startsWith('custom-emojis/')) {
    return { success: false, message: '絵文字画像の保存先が不正です。' };
  }

  const mimeType = input.mimeType.trim().toLowerCase();
  if (!ALLOWED_CUSTOM_EMOJI_MIME_TYPES.has(mimeType)) {
    return { success: false, message: 'PNG/JPEG/GIF/WebP の画像だけ使えます。' };
  }

  if (input.width !== 128 || input.height !== 128) {
    return { success: false, message: '絵文字画像は128x128に正規化してから登録してください。' };
  }

  try {
    const customEmoji = await db.customEmoji.create({
      data: {
        name,
        imageUrl,
        storagePath,
        mimeType,
        width: input.width,
        height: input.height,
        creatorId: session.id,
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        width: true,
        height: true,
      },
    });

    revalidateTag(CUSTOM_EMOJI_CACHE_TAG, 'max');
    revalidatePath('/');
    revalidatePath('/profile');

    return { success: true, customEmoji };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { success: false, message: 'その絵文字名はすでに使われています。' };
    }
    console.error('Failed to create custom emoji', error);
    return { success: false, message: 'カスタム絵文字を作成できませんでした。' };
  }
}
