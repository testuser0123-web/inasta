'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function addComment(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  if (session.username === 'guest') {
    return { message: 'ゲストユーザーはコメントできません' };
  }

  const postIdStr = formData.get('postId');
  const text = formData.get('text');

  if (!postIdStr || !text || typeof text !== 'string') {
    return { message: 'Invalid input' };
  }

  const postId = parseInt(postIdStr as string, 10);
  const commentText = text.trim();

  if (commentText.length === 0) {
    return { message: 'Comment cannot be empty' };
  }

  if (commentText.length > 31) {
    return { message: 'Comment too long (max 31 chars)' };
  }

  try {
    await db.comment.create({
      data: {
        text: commentText,
        postId,
        userId: session.id,
      },
    });

    revalidatePath('/'); // Revalidate feed
    revalidatePath(`/p/${postId}`); // Revalidate single post page
    return { message: 'Comment added', success: true };
  } catch (error) {
    console.error('Failed to add comment:', error);
    return { message: 'Failed to add comment' };
  }
}
