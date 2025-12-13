'use server';

import { db as prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const createContestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  duration: z.coerce.number().min(1).max(7),
});

const createPostSchema = z.object({
  imageUrl: z.string().url(),
  comment: z.string().max(200).optional(),
  contestId: z.coerce.number(),
});

export async function createContest(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: 'Unauthorized' };
  }

  const validatedFields = createContestSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    duration: formData.get('duration'),
  });

  if (!validatedFields.success) {
    return { message: validatedFields.error.flatten().fieldErrors };
  }

  const { title, description, duration } = validatedFields.data;
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);

  try {
    await prisma.contest.create({
      data: {
        title,
        description,
        startDate,
        endDate,
        creator: { connect: { id: session.id } },
      },
    });
  } catch (error) {
    console.error('Failed to create contest:', error);
    return { message: 'Failed to create contest' };
  }

  revalidatePath('/contests');
  redirect('/contests?tab=active');
}

export async function getContests(filter: 'active' | 'ended') {
  const now = new Date();

  return prisma.contest.findMany({
    where: {
      endDate: filter === 'active' ? { gt: now } : { lte: now },
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      creator: {
        select: { username: true },
      },
      _count: {
        select: { posts: true },
      },
    },
  });
}

export async function getContest(id: number) {
  return prisma.contest.findUnique({
    where: { id },
    include: {
      creator: { select: { username: true } },
    },
  });
}

export async function createContestPost(prevState: any, formData: FormData) {
    const session = await getSession();
    if (!session) {
        return { message: 'Unauthorized' };
    }

    const contestId = Number(formData.get('contestId'));
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });

    if (!contest) {
        return { message: 'Contest not found' };
    }

    if (new Date() > contest.endDate) {
        return { message: 'Contest has ended' };
    }

    const imageUrlsJson = formData.get('imageUrls') as string;
    let imageUrls: string[] = [];
    try {
        imageUrls = JSON.parse(imageUrlsJson);
    } catch {
        return { message: 'Invalid image data' };
    }

    if (imageUrls.length === 0) {
        return { message: 'At least one image is required' };
    }

    const comment = formData.get('comment') as string;

    try {
        await prisma.contestPost.create({
            data: {
                imageUrl: imageUrls[0], // Main image
                comment,
                user: { connect: { id: session.id } },
                contest: { connect: { id: contestId } },
                images: {
                    create: imageUrls.slice(1).map((url, index) => ({
                        url,
                        order: index,
                    })),
                },
            },
        });
    } catch (error) {
        console.error("Failed to create contest post", error);
        return { message: 'Failed to create post' };
    }

    revalidatePath(`/contests/${contestId}`);
    redirect(`/contests/${contestId}`);
}

export async function fetchContestPosts({ contestId, sortBy = 'newest', cursorId }: { contestId: number, sortBy?: string, cursorId?: number }) {
    const session = await getSession();
    const currentUserId = session?.id;

    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) throw new Error("Contest not found");

    const isEnded = new Date() > contest.endDate;

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sortBy === 'likes_desc') orderBy = { likes: { _count: 'desc' } };
    else if (sortBy === 'likes_asc') orderBy = { likes: { _count: 'asc' } };

    const posts = await prisma.contestPost.findMany({
        where: { contestId },
        take: 12,
        skip: cursorId ? 1 : 0,
        cursor: cursorId ? { id: cursorId } : undefined,
        orderBy,
        include: {
            user: {
                select: {
                    username: true,
                    avatarUrl: true,
                    isVerified: true,
                    isGold: true,
                }
            },
            images: {
                orderBy: { order: 'asc' }
            },
            likes: currentUserId ? {
                where: { userId: currentUserId }
            } : false,
            _count: {
                select: { likes: true }
            }
        }
    });

    return posts.map(post => ({
        ...post,
        likesCount: post._count.likes,
        hasLiked: currentUserId ? post.likes.length > 0 : false,
        isEnded
    }));
}

export async function toggleContestLike(postId: number) {
    const session = await getSession();
    if (!session) return { message: 'Unauthorized' };

    const post = await prisma.contestPost.findUnique({
        where: { id: postId },
        include: { contest: true }
    });

    if (!post) return { message: 'Post not found' };

    if (new Date() > post.contest.endDate) {
        return { message: 'Contest has ended' };
    }

    const existingLike = await prisma.contestLike.findUnique({
        where: {
            userId_contestPostId: {
                userId: session.id,
                contestPostId: postId
            }
        }
    });

    if (existingLike) {
        await prisma.contestLike.delete({
            where: { id: existingLike.id }
        });
    } else {
        await prisma.contestLike.create({
            data: {
                user: { connect: { id: session.id } },
                contestPost: { connect: { id: postId } }
            }
        });
    }

    revalidatePath(`/contests/${post.contestId}`);
    return { success: true };
}

export async function getContestWinners(contestId: number) {
    const winners = await prisma.contestPost.findMany({
        where: { contestId },
        include: {
             user: {
                select: {
                    username: true,
                    avatarUrl: true,
                    isVerified: true,
                    isGold: true,
                }
            },
            images: {
                 orderBy: { order: 'asc' }
            },
            _count: {
                select: { likes: true }
            }
        },
        orderBy: [
            { likes: { _count: 'desc' } },
            { createdAt: 'asc' }
        ],
        take: 3
    });

    return winners.map(post => ({
        ...post,
        likesCount: post._count.likes
    }));
}
