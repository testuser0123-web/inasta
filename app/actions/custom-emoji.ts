'use server';

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { normalizeCustomEmojiName, type CustomEmojiSummary } from '@/lib/reactions';

const ALLOWED_CUSTOM_EMOJI_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);

const CUSTOM_EMOJI_CACHE_TAG = 'custom-emojis';
const MAX_CUSTOM_EMOJI_URL_LENGTH = 2048;

const getCachedCustomEmojis = unstable_cache(
  async () => db.customEmoji.findMany({
    where: { isActive: true },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      imageUrl: true,
      creatorId: true,
      creator: { select: { username: true } },
      width: true,
      height: true,
    },
  }),
  ['custom-emojis:list'],
  { tags: [CUSTOM_EMOJI_CACHE_TAG], revalidate: 300 }
);

export async function fetchCustomEmojis(): Promise<CustomEmojiSummary[]> {
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
        creatorId: true,
        creator: { select: { username: true } },
        width: true,
        height: true,
      },
    });

    revalidateTag(CUSTOM_EMOJI_CACHE_TAG, 'max');
    revalidatePath('/');
    revalidatePath('/profile');
    revalidatePath('/custom-emojis');

    return { success: true, customEmoji };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { success: false, message: 'その絵文字名はすでに使われています。' };
    }
    console.error('Failed to create custom emoji', error);
    return { success: false, message: 'カスタム絵文字を作成できませんでした。' };
  }
}

export async function updateCustomEmoji(input: {
  id: number;
  name: string;
  imageUrl?: string;
  storagePath?: string;
  mimeType?: string;
  width?: number;
  height?: number;
}) {
  const session = await getSession();
  if (!session) {
    return { success: false, message: 'ログインが必要です。' };
  }

  if (!Number.isInteger(input.id) || input.id <= 0) {
    return { success: false, message: '絵文字が見つかりません。' };
  }

  let name: string;
  try {
    name = normalizeCustomEmojiName(input.name);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '絵文字名が不正です。' };
  }

  const existing = await db.customEmoji.findUnique({
    where: { id: input.id },
    select: { creatorId: true, isActive: true },
  });

  if (!existing || !existing.isActive) {
    return { success: false, message: '絵文字が見つかりません。' };
  }

  if (existing.creatorId !== session.id) {
    return { success: false, message: 'この絵文字は編集できません。' };
  }

  const data: {
    name: string;
    imageUrl?: string;
    storagePath?: string;
    mimeType?: string;
    width?: number;
    height?: number;
  } = { name };

  if (input.imageUrl !== undefined) {
    const imageUrl = input.imageUrl.trim();
    if (!imageUrl || imageUrl.length > MAX_CUSTOM_EMOJI_URL_LENGTH || !/^https?:\/\//.test(imageUrl) || imageUrl.startsWith('data:image') || imageUrl.includes('base64')) {
      return { success: false, message: '画像URLが不正です。' };
    }
    const storagePath = input.storagePath?.trim() ?? '';
    if (!storagePath.startsWith('custom-emojis/')) {
      return { success: false, message: '絵文字画像の保存先が不正です。' };
    }
    const mimeType = input.mimeType?.trim().toLowerCase() ?? '';
    if (!ALLOWED_CUSTOM_EMOJI_MIME_TYPES.has(mimeType)) {
      return { success: false, message: 'PNG/JPEG/GIF/WebP の画像だけ使えます。' };
    }
    if (input.width !== 128 || input.height !== 128) {
      return { success: false, message: '絵文字画像は128x128に正規化してから登録してください。' };
    }
    data.imageUrl = imageUrl;
    data.storagePath = storagePath;
    data.mimeType = mimeType;
    data.width = input.width;
    data.height = input.height;
  }

  try {
    const customEmoji = await db.customEmoji.update({
      where: { id: input.id },
      data,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        creatorId: true,
        creator: { select: { username: true } },
        width: true,
        height: true,
      },
    });

    revalidateTag(CUSTOM_EMOJI_CACHE_TAG, 'max');
    revalidatePath('/');
    revalidatePath('/custom-emojis');

    return { success: true, customEmoji };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { success: false, message: 'その絵文字名はすでに使われています。' };
    }
    console.error('Failed to update custom emoji', error);
    return { success: false, message: 'カスタム絵文字を更新できませんでした。' };
  }
}

export async function deleteCustomEmoji(id: number) {
  const session = await getSession();
  if (!session) {
    return { success: false, message: 'ログインが必要です。' };
  }

  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, message: '絵文字が見つかりません。' };
  }

  const existing = await db.customEmoji.findUnique({
    where: { id },
    select: { creatorId: true, isActive: true },
  });

  if (!existing || !existing.isActive) {
    return { success: false, message: '絵文字が見つかりません。' };
  }

  if (existing.creatorId !== session.id) {
    return { success: false, message: 'この絵文字は削除できません。' };
  }

  await db.customEmoji.update({
    where: { id },
    data: { isActive: false },
  });

  revalidateTag(CUSTOM_EMOJI_CACHE_TAG, 'max');
  revalidatePath('/');
  revalidatePath('/custom-emojis');

  return { success: true };
}
