'use server';

import { db } from '@/lib/db';
import { getSession, encrypt } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { USERNAME_REGEX } from '@/lib/validation';

export async function updateProfile(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  const username = formData.get('username') as string;
  const avatarUrl = formData.get('avatarUrl') as string;

  if (!username) {
    return { message: 'Username is required' };
  }

  if (!USERNAME_REGEX.test(username)) {
    return { message: 'Username must be alphanumeric (letters and numbers only)' };
  }

  try {
    // Check if username is taken by another user
    const existingUser = await db.user.findUnique({
      where: { username },
    });

    if (existingUser && existingUser.id !== session.id) {
      return { message: 'Username already taken' };
    }

    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: {
        username,
        avatarUrl: avatarUrl || undefined, // Only update if provided
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
    return { message: 'Failed to update profile' };
  }

  revalidatePath('/profile');
  revalidatePath('/');
  revalidatePath(`/users/${username}`); // In case we are viewing public profile
  return { message: 'Profile updated successfully', success: true };
}

export async function followUser(targetUserId: number) {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };
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
