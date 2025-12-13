'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export async function getContests(tab: 'active' | 'ended') {
  const now = new Date();
  const where = tab === 'active'
    ? { endDate: { gt: now } }
    : { endDate: { lte: now } };

  const contests = await db.contest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      creator: {
        select: {
          username: true,
        },
      },
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  return contests;
}

export async function getContest(id: number) {
  return db.contest.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          username: true,
        },
      },
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });
}

const createContestSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  duration: z.coerce.number().min(1).max(7),
});

export async function createContest(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session) return { message: 'ログインが必要です' };

  const validatedFields = createContestSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    duration: formData.get('duration'),
  });

  if (!validatedFields.success) {
    return { message: '入力内容が正しくありません' };
  }

  const { title, description, duration } = validatedFields.data;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

  try {
    await db.contest.create({
      data: {
        title,
        description,
        startDate,
        endDate,
        creator: {
            connect: { id: session.id }
        },
      },
    });
  } catch (e) {
    console.error(e);
    return { message: 'コンテストの作成に失敗しました' };
  }

  revalidatePath('/contests');
  redirect('/contests');
}

const createPostSchema = z.object({
  contestId: z.coerce.number(),
  imageUrls: z.string().transform(str => {
      try {
          return JSON.parse(str);
      } catch {
          return [];
      }
  }).pipe(z.array(z.string()).min(1).max(1)),
  comment: z.string().max(200).optional(),
});

export async function createContestPost(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session) return { message: 'ログインが必要です', success: false };

  const validatedFields = createPostSchema.safeParse({
    contestId: formData.get('contestId'),
    imageUrls: formData.get('imageUrls'),
    comment: formData.get('comment'),
  });

  if (!validatedFields.success) {
    return { message: '入力内容が正しくありません', success: false };
  }

  const { contestId, imageUrls, comment } = validatedFields.data;

  // Check if contest is active
  const contest = await db.contest.findUnique({ where: { id: contestId } });
  if (!contest || new Date() > contest.endDate) {
      return { message: 'コンテストは終了しています', success: false };
  }

  try {
    await db.contestPost.create({
      data: {
        imageUrl: imageUrls[0], // Primary image
        comment,
        user: { connect: { id: session.id } },
        contest: { connect: { id: contestId } },
      },
    });
  } catch (e) {
    console.error(e);
    return { message: '投稿に失敗しました', success: false };
  }

  revalidatePath(`/contests/${contestId}`);
  return { message: '投稿しました', success: true };
}

export async function fetchContestPosts({ contestId, sortBy }: { contestId: number; sortBy: string }) {
  const session = await getSession();

  let orderBy: any = { createdAt: 'desc' };
  if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
  if (sortBy === 'likes_desc') orderBy = { likes: { _count: 'desc' } };
  if (sortBy === 'likes_asc') orderBy = { likes: { _count: 'asc' } };

  const posts = await db.contestPost.findMany({
    where: { contestId },
    orderBy,
    include: {
      user: {
        select: {
          username: true,
          avatarUrl: true,
          isVerified: true,
          isGold: true,
          updatedAt: true,
        },
      },
      images: {
          orderBy: { order: 'asc' }
      },
      _count: {
        select: {
          likes: true,
        },
      },
      likes: {
          where: { userId: session?.id ?? -1 },
          select: { userId: true }
      }
    },
  });

  return posts.map(post => ({
      ...post,
      imageUrl: post.imageUrl.startsWith('data:') ? `/api/contest_image/${post.id}.png` : post.imageUrl,
      user: {
          ...post.user,
          avatarUrl: post.user.avatarUrl ? `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}` : null
      },
      likesCount: post._count.likes,
      hasLiked: post.likes.length > 0,
      likes: undefined,
      _count: undefined
  }));
}

export async function toggleContestLike(postId: number) {
  const session = await getSession();
  if (!session) return;

  const post = await db.contestPost.findUnique({
      where: { id: postId },
      include: { contest: true }
  });

  if (!post) return;
  if (new Date() > post.contest.endDate) return; // Cannot like ended contests

  const existing = await db.contestLike.findUnique({
    where: {
      userId_contestPostId: {
        userId: session.id,
        contestPostId: postId,
      },
    },
  });

  if (existing) {
    await db.contestLike.delete({
      where: { id: existing.id },
    });
  } else {
    await db.contestLike.create({
      data: {
        userId: session.id,
        contestPostId: postId,
      },
    });
  }

  revalidatePath(`/contests/${post.contestId}`);
}

export async function getContestWinners(contestId: number) {
    // Top 3 by likes
    const posts = await db.contestPost.findMany({
        where: { contestId },
        orderBy: [
            { likes: { _count: 'desc' } },
            { createdAt: 'asc' }
        ],
        take: 3,
        include: {
            user: {
                select: {
                    username: true,
                    avatarUrl: true,
                    isVerified: true,
                    isGold: true,
                    updatedAt: true,
                },
            },
            images: {
                orderBy: { order: 'asc' }
            },
            _count: {
                select: {
                    likes: true,
                },
            },
            likes: {
                where: { userId: -1 }, // Winners view doesn't need 'hasLiked' usually, or we can pass session if needed
                select: { userId: true }
            }
        },
    });

    return posts.map(post => ({
        ...post,
        imageUrl: post.imageUrl.startsWith('data:') ? `/api/contest_image/${post.id}.png` : post.imageUrl,
        user: {
            ...post.user,
            avatarUrl: post.user.avatarUrl ? `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}` : null
        },
        likesCount: post._count.likes,
        hasLiked: false,
        likes: undefined,
        _count: undefined
    }));
}
