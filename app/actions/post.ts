'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';

export async function fetchFeedPosts({ cursorId, feedType }: { cursorId?: number, feedType: 'all' | 'following' }) {
  const session = await getSession();
  if (!session) return [];

  // Get muted users to exclude
  const muted = await db.mute.findMany({
    where: { muterId: session.id },
    select: { mutedId: true },
  });
  const mutedIds = muted.map((m) => m.mutedId);

  let whereClause: Prisma.PostWhereInput = {
    userId: { notIn: mutedIds },
  };

  if (feedType === 'following') {
    const following = await db.follow.findMany({
      where: { followerId: session.id },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    whereClause = {
      ...whereClause,
      userId: { in: followingIds, notIn: mutedIds },
    };
  }

  const postsData = await db.post.findMany({
    take: 12,
    skip: cursorId ? 1 : 0,
    cursor: cursorId ? { id: cursorId } : undefined,
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      imageUrl: true,
      comment: true,
      userId: true,
      user: {
        select: {
          username: true,
          avatarUrl: true,
          isVerified: true,
        },
      },
      _count: {
        select: { likes: true },
      },
      likes: {
        where: { userId: session.id },
        select: { userId: true },
      },
    },
  });

  return postsData.map((post) => ({
    ...post,
    likesCount: post._count.likes,
    hasLiked: post.likes.length > 0,
    likes: undefined,
    _count: undefined,
  }));
}

export async function createPost(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  const imageUrl = formData.get('imageUrl') as string;
  const comment = formData.get('comment') as string;

  if (!imageUrl) {
    return { message: 'Image is required' };
  }

  if (comment && comment.length > 17) {
    return { message: 'Comment too long (max 17 chars)' };
  }

  try {
    await db.post.create({
      data: {
        imageUrl,
        comment,
        userId: session.id,
      },
    });
  } catch (error) {
    console.error('Failed to create post:', error);
    return { message: 'Failed to create post' };
  }

  revalidatePath('/');
  revalidatePath('/profile');
  redirect('/');
}

export async function toggleLike(postId: number) {
  const session = await getSession();
  if (!session) return; 

  const existingLike = await db.like.findUnique({
    where: {
      userId_postId: {
        userId: session.id,
        postId: postId,
      },
    },
  });

  if (existingLike) {
    await db.like.delete({
      where: {
        userId_postId: {
          userId: session.id,
          postId: postId,
        },
      },
    });
  } else {
    await db.like.create({
      data: {
        userId: session.id,
        postId: postId,
      },
    });
  }

  revalidatePath('/');
  revalidatePath('/profile');
  // Revalidate dynamic user pages too, but we can't easily know all usernames here.
  // Ideally, revalidateTag logic should be used, but for now this covers main views.
}

export async function deletePost(postId: number) {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const post = await db.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return { message: 'Post not found' };
  }

  if (post.userId !== session.id) {
    return { message: 'Forbidden' };
  }

  await db.post.delete({
    where: { id: postId },
  });

  revalidatePath('/');
  revalidatePath('/profile');
}