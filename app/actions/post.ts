"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export async function fetchFeedPosts({
  cursorId,
  feedType,
  searchQuery,
}: {
  cursorId?: number;
  feedType: "all" | "following" | "search";
  searchQuery?: string;
}) {
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

  if (feedType === "following") {
    const following = await db.follow.findMany({
      where: { followerId: session.id },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    whereClause = {
      ...whereClause,
      userId: { in: followingIds, notIn: mutedIds },
    };
  } else if (feedType === "search") {
    if (!searchQuery) return []; // Don't return any posts if search query is empty

    const query = searchQuery.startsWith("#") ? searchQuery : `#${searchQuery}`;
    whereClause = {
      ...whereClause,
      hashtags: {
        some: {
          name: query,
        },
      },
    };
  }

  const postsData = await db.post.findMany({
    take: 12,
    skip: cursorId ? 1 : 0,
    cursor: cursorId ? { id: cursorId } : undefined,
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      // imageUrl: true, // Don't fetch the base64 string, use the API route instead
      comment: true,
      userId: true,
      hashtags: {
        select: {
          name: true,
        },
      },
      images: {
        select: {
          id: true,
          order: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
      user: {
        select: {
          username: true,
          avatarUrl: true,
          updatedAt: true,
          isVerified: true,
        },
      },
      comments: {
        select: {
          id: true,
          text: true,
          userId: true,
          user: {
            select: {
              username: true,
              avatarUrl: true,
            }
          }
        },
        orderBy: { createdAt: 'asc' } // Oldest first or newest? Usually oldest first in thread.
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
    user: {
      ...post.user,
      avatarUrl: post.user.avatarUrl ? `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}` : null,
    },
    likesCount: post._count.likes,
    hasLiked: post.likes.length > 0,
    likes: undefined,
    _count: undefined,
  }));
}

export async function createPost(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const imageUrlsJson = formData.get("imageUrls") as string;
  const imageUrl = formData.get("imageUrl") as string; // Fallback or first image
  const comment = formData.get("comment") as string;
  const hashtagsRaw = formData.get("hashtags") as string;

  // We expect imageUrlsJson to be a JSON string of string[]
  let imageUrls: string[] = [];
  if (imageUrlsJson) {
      try {
          imageUrls = JSON.parse(imageUrlsJson);
      } catch (e) {
          console.error("Failed to parse imageUrls", e);
      }
  }

  // If no JSON array, fall back to single imageUrl
  if (imageUrls.length === 0 && imageUrl) {
      imageUrls = [imageUrl];
  }

  if (imageUrls.length === 0) {
    return { message: "Image is required" };
  }

  if (comment && comment.length > 173) {
    return { message: "コメントが長すぎます(173文字まで)" };
  }

  // Parse hashtags
  let hashtagList: string[] = [];
  if (hashtagsRaw) {
    // Split by space, filter empty strings
    hashtagList = hashtagsRaw
      .split(" ")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)); // Add # if missing

    // Remove duplicates
    hashtagList = Array.from(new Set(hashtagList));

    if (hashtagList.length > 3) {
      return { message: "ハッシュタグは3つまでです" };
    }
  }

  try {
    const [firstImage, ...restImages] = imageUrls;

    await db.post.create({
      data: {
        imageUrl: firstImage,
        comment,
        userId: session.id,
        hashtags: {
          connectOrCreate: hashtagList.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
        images: {
            create: restImages.map((url, index) => ({
                url: url,
                order: index + 1, // Start order from 1 (0 is the main post image)
            }))
        }
      },
    });
  } catch (error) {
    console.error("Failed to create post:", error);
    return { message: "Failed to create post" };
  }

  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/");
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

  revalidatePath("/");
  revalidatePath("/profile");
  // Revalidate dynamic user pages too, but we can't easily know all usernames here.
  // Ideally, revalidateTag logic should be used, but for now this covers main views.
}

export async function deletePost(postId: number) {
  const session = await getSession();
  if (!session) return { message: "Unauthorized" };

  const post = await db.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return { message: "Post not found" };
  }

  if (post.userId !== session.id) {
    return { message: "Forbidden" };
  }

  await db.post.delete({
    where: { id: postId },
  });

  revalidatePath("/");
  revalidatePath("/profile");
}
