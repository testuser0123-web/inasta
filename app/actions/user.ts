'use server';

import { db } from '@/lib/db';
import { getSession, encrypt } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { USERNAME_REGEX, PASSWORD_REGEX } from '@/lib/validation';
import bcrypt from 'bcryptjs';

export async function updateProfile(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  if (session.username === 'guest') {
    return { message: 'ゲストユーザーはプロフィールを変更できません' };
  }

  const username = formData.get('username') as string;
  const avatarUrl = formData.get('avatarUrl') as string;
  const bio = formData.get('bio') as string;
  const oshi = formData.get('oshi') as string;

  if (!username) {
    return { message: 'ユーザー名は必須です' };
  }

  if (!USERNAME_REGEX.test(username)) {
    return { message: 'ユーザー名には英数字、日本語、記号（_ @ . - = ( ) （ ））が使えます' };
  }

  if (username.length > 50) {
    return { message: 'ユーザー名は50文字以内で入力してください' };
  }

  if (bio && bio.length > 160) {
    return { message: '自己紹介は160文字以内で入力してください' };
  }

  if (oshi && oshi.length > 20) {
    return { message: '推し名は20文字以内で入力してください' };
  }

  try {
    // Check if username is taken by another user
    const existingUser = await db.user.findUnique({
      where: { username },
    });

    if (existingUser && existingUser.id !== session.id) {
      return { message: 'このユーザー名は既に使用されています' };
    }

    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: {
        username,
        avatarUrl: avatarUrl || undefined, // Only update if provided. If empty string (removed), use null? Or undefined to skip?
        // If avatarUrl is "", we might want to keep existing or clear it?
        // Form sends existing value if not changed.
        // If user wants to delete avatar, client should send specific signal, but UI doesn't support delete yet.
        // So `undefined` preserves existing if `avatarUrl` is falsy (empty).
        bio: bio || null,
        oshi: oshi || null,
      },
    });

    // Update session with new username
    const newSession = await encrypt({ id: updatedUser.id, username: updatedUser.username });
    const cookieStore = await cookies();
    cookieStore.set('session', newSession, {
      httpOnly: true,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

  } catch (error) {
    console.error('Failed to update profile:', error);
    return { message: 'プロフィールの更新に失敗しました' };
  }

  revalidatePath('/profile');
  revalidatePath('/');
  revalidatePath(`/users/${username}`); // In case we are viewing public profile
  return { message: 'プロフィールを更新しました', success: true };
}

export async function followUser(targetUserId: number) {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };
  if (session.username === 'guest') return { message: 'Forbidden' };
  if (session.id === targetUserId) return { message: 'Cannot follow yourself' };

  try {
    await db.follow.create({
      data: {
        followerId: session.id,
        followingId: targetUserId,
      },
    });
    revalidatePath(`/users`); // Revalidate generally, or specific user path if possible
    revalidatePath('/'); // For feed
  } catch (error) {
    // Unique constraint error likely means already following
    console.error('Failed to follow:', error);
  }
}

export async function unfollowUser(targetUserId: number) {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };
  if (session.username === 'guest') return { message: 'Forbidden' };

  try {
    await db.follow.delete({
      where: {
        followerId_followingId: {
          followerId: session.id,
          followingId: targetUserId,
        },
      },
    });
    revalidatePath(`/users`);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to unfollow:', error);
  }
}

export async function muteUser(targetUserId: number) {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };
  if (session.username === 'guest') return { message: 'Forbidden' };
  if (session.id === targetUserId) return { message: 'Cannot mute yourself' };

  try {
    await db.mute.create({
      data: {
        muterId: session.id,
        mutedId: targetUserId,
      },
    });
    revalidatePath(`/users`);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to mute:', error);
  }
}

export async function unmuteUser(targetUserId: number) {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };
  if (session.username === 'guest') return { message: 'Forbidden' };

  try {
    await db.mute.delete({
      where: {
        muterId_mutedId: {
          muterId: session.id,
          mutedId: targetUserId,
        },
      },
    });
    revalidatePath(`/users`);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to unmute:', error);
  }
}

export async function changePassword(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  if (session.username === 'guest') {
    return { message: 'ゲストユーザーはパスワードを変更できません' };
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!currentPassword || !newPassword) {
    return { message: '現在のパスワードと新しいパスワードを入力してください' };
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
      return { message: "パスワードには英数字、記号が使えます" };
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
  });

  if (!user) {
    return { message: 'User not found' };
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);

  if (!isValid) {
    return { message: '現在のパスワードが間違っています' };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: session.id },
    data: {
      password: hashedPassword,
    },
  });

  return { message: 'パスワードを変更しました', success: true };
}

export async function updateSettings(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  if (session.username === 'guest') {
    return { message: 'ゲストユーザーは設定を変更できません' };
  }

  const excludeUnverifiedPosts = formData.get('excludeUnverifiedPosts') === 'on';

  try {
    await db.user.update({
      where: { id: session.id },
      data: {
        excludeUnverifiedPosts,
      },
    });

    revalidatePath('/'); // Revalidate feed
  } catch (error) {
    console.error('Failed to update settings:', error);
    return { message: 'Failed to update settings' };
  }

  return { message: '設定を保存しました', success: true };
}
