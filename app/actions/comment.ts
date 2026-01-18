'use server';

import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const commentSchema = z.object({
  postId: z.number(),
  text: z.string().min(1).max(31, 'Comment must be 31 characters or less'),
});

export async function addComment(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  const postId = Number(formData.get('postId'));
  const text = formData.get('text') as string;

  const validatedFields = commentSchema.safeParse({
    postId,
    text,
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.flatten().fieldErrors.text?.[0] || 'Invalid input',
    };
  }

  try {
    const newComment = await db.comment.create({
      data: {
        text: validatedFields.data.text,
        postId: validatedFields.data.postId,
        userId: session.id, // session.id is the correct property name in lib/auth.ts
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    revalidatePath('/');
    return { success: true, message: 'Comment added', comment: newComment };
  } catch (error) {
    console.error('Failed to add comment:', error);
    return { message: 'Failed to add comment' };
  }
}

export async function deleteComment(commentId: number) {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  try {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return { message: 'Comment not found' };
    }

    if (comment.userId !== session.id) {
      return { message: 'Forbidden' };
    }

    await db.comment.delete({
      where: { id: commentId },
    });

    // Revalidate paths where comments might be shown
    revalidatePath('/');
    revalidatePath(`/p/${comment.postId}`);

    return { success: true, message: 'Comment deleted' };
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return { message: 'Failed to delete comment' };
  }
}
