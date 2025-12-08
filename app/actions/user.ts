'use server';

import { db } from '@/lib/db';
import { getSession, encrypt } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

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
