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

  // Check user settings for excluding unverified posts
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { excludeUnverifiedPosts: true },
  });

  let whereClause: Prisma.PostWhereInput = {
    userId: { notIn: mutedIds },
  };

  if (feedType === "all" && user?.excludeUnverifiedPosts) {
     whereClause = {
         ...whereClause,
         user: {
             isVerified: true
         }
     };
  }

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
      isSpoiler: true,
      createdAt: true,
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
          isGold: true,
          roles: true,
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

export async function fetchUserPosts({
  userId,
  cursorId,
}: {
  userId: number;
  cursorId?: number;
}) {
  const session = await getSession();
  // if (!session) return []; // Allow fetching user posts without session? Or follow page rules?
  // Page seems to allow viewing profiles without session, but checking 'liked' status needs session.

  const postsData = await db.post.findMany({
    take: 12,
    skip: cursorId ? 1 : 0,
    cursor: cursorId ? { id: cursorId } : undefined,
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      comment: true,
      isSpoiler: true,
      createdAt: true,
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
          isGold: true,
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
        orderBy: { createdAt: 'asc' }
      },
      _count: {
        select: { likes: true },
      },
      likes: {
        where: { userId: session?.id ?? -1 },
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

export async function fetchLikedPosts({
  userId,
  cursorId,
}: {
  userId: number;
  cursorId?: number;
}) {
  const session = await getSession();

  // Note: Only allow seeing liked posts if it's "Me" (current user).
  // The UI currently only shows Liked tab for the current user in ProfileClient (initialStatus.isMe check).
  // If we want to strictly enforce this on backend, we should check if session.id == userId.
  if (!session || session.id !== userId) return [];

  // Likes are stored in Like table. We need to fetch Like table with pagination, then get the posts.
  // However, Like table cursor would be on Like ID or createdAt, but the UI expects Post cursor?
  // Usually infinite scroll uses the ID of the last item in the list.
  // Here the list is of Liked Posts.
  // Ideally we should paginate on the Like table.
  // If we pass cursorId (postId), we need to find the Like record corresponding to that Post to use as cursor?
  // Or maybe we can assume cursorId refers to the Like ID?
  // But the frontend usually passes the ID of the last element it rendered. The elements are Posts.
  // So the cursorId passed will be a Post ID.

  // Wait, if we paginate on Like table, the cursor should be Like ID.
  // But the Feed component expects a list of Posts.
  // And `loadMore` in Feed.tsx passes `lastPostId` as cursor.
  // So if we use `lastPostId` as cursor for `fetchLikedPosts`, we need to find the Like entry for that post.

  // let cursorOption = undefined;
  // if (cursorId) {
  //     await db.like.findUnique({
  //         where: {
  //             userId_postId: {
  //                 userId: userId,
  //                 postId: cursorId
  //             }
  //         },
  //         select: { id: true }
  //     });
  // }

  const likedPostsData = await db.like.findMany({
    take: 12,
    skip: cursorId ? 1 : 0,
    cursor: cursorId ? { userId_postId: { userId: userId, postId: cursorId } } : undefined,
    where: { userId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      post: {
        select: {
            id: true,
            comment: true,
            isSpoiler: true,
            createdAt: true,
            userId: true,
            hashtags: {
                select: { name: true }
            },
            images: {
                select: { id: true, order: true },
                orderBy: { order: 'asc' }
            },
            user: {
                select: {
                    username: true,
                    avatarUrl: true,
                    updatedAt: true,
                    isVerified: true,
                    isGold: true,
                    roles: true,
                }
            },
            comments: {
                select: {
                    id: true,
                    text: true,
                    userId: true,
                    user: {
                        select: { username: true, avatarUrl: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            _count: {
                select: { likes: true }
            },
            likes: {
                where: { userId: session.id }, // Check if *session user* liked this post
                select: { userId: true }
            }
        }
      }
    }
  });

  return likedPostsData.map((item) => ({
    ...item.post,
    user: {
      ...item.post.user,
      avatarUrl: item.post.user.avatarUrl ? `/api/avatar/${item.post.user.username}?v=${item.post.user.updatedAt.getTime()}` : null,
    },
    likesCount: item.post._count.likes,
    hasLiked: item.post.likes.length > 0,
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
  const isSpoiler = formData.get("isSpoiler") === "true";

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
        isSpoiler,
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
