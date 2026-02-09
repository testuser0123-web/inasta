'use server';

import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';

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

    // Notify post author if commenter is not the author
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { userId: true }
    });

    if (post && post.userId !== session.id) {
      await db.notification.create({
        data: {
          userId: post.userId,
          type: NotificationType.SYSTEM,
          title: '新しいコメント',
          content: `${session.username}さんからコメントが付きました。ここからチェック`,
          metadata: { postId: postId, commentId: newComment.id }
        }
      });
    }

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

    // Find and delete the associated notification
    const notifications = await db.notification.findMany({
      where: {
        type: NotificationType.SYSTEM,
        // We can't query JSON fields directly with simple equality in all Prisma versions/adapters easily,
        // but for now, let's try path based filtering if supported or fetch candidate notifications.
        // Since we don't have a direct relation, we'll fetch notifications for the post owner and filter in memory or use raw query if needed.
        // However, Prisma supports JSON filtering. Let's try to match the structure.
        metadata: {
          path: ['commentId'],
          equals: commentId
        }
      }
    });

    if (notifications.length > 0) {
      await db.notification.deleteMany({
        where: {
          id: { in: notifications.map(n => n.id) }
        }
      });
    }

    // Revalidate paths where comments might be shown
    revalidatePath('/');
    revalidatePath(`/p/${comment.postId}`);

    return { success: true, message: 'Comment deleted' };
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return { message: 'Failed to delete comment' };
  }
}
