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
      imageUrl: true, // For fallback
      imageBlobUrl: true,
      comment: true,
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
          url: true, // For fallback
          blobUrl: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
      user: {
        select: {
          username: true,
          avatarUrl: true, // For fallback
          avatarBlobUrl: true,
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
              avatarUrl: true, // For fallback
              avatarBlobUrl: true,
            }
          }
        },
        orderBy: { createdAt: 'asc' }
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

  return postsData.map((post) => {
    // Resolve Post Image
    let displayImageUrl = post.imageBlobUrl;
    if (!displayImageUrl) {
        displayImageUrl = (post.imageUrl?.startsWith("data:") ? post.imageUrl : `/api/image/post-${post.id}.png`);
    }

    // Resolve User Avatar
    const userAvatar = post.user.avatarBlobUrl ||
       (post.user.avatarUrl ?
         (post.user.avatarUrl.startsWith("data:") ? post.user.avatarUrl : `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}`)
         : null);

    return {
      ...post,
      imageUrl: displayImageUrl!, // Force string as fallback ensures it
      user: {
        ...post.user,
        avatarUrl: userAvatar,
      },
      images: post.images.map(img => ({
          ...img,
          url: img.blobUrl || img.url || '' // Provide fallback for TS
      })),
      comments: post.comments.map(c => ({
          ...c,
          user: {
              ...c.user,
              avatarUrl: c.user.avatarBlobUrl ||
                 (c.user.avatarUrl ?
                   (c.user.avatarUrl.startsWith("data:") ? c.user.avatarUrl : `/api/avatar/${c.user.username}?v=${Date.now()}`)
                   : null)
          }
      })),
      likesCount: post._count.likes,
      hasLiked: post.likes.length > 0,
      likes: undefined,
      _count: undefined,
    };
  });
}

export async function fetchUserPosts({
  userId,
  cursorId,
}: {
  userId: number;
  cursorId?: number;
}) {
  const session = await getSession();

  const postsData = await db.post.findMany({
    take: 12,
    skip: cursorId ? 1 : 0,
    cursor: cursorId ? { id: cursorId } : undefined,
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      imageUrl: true,
      imageBlobUrl: true,
      comment: true,
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
          url: true,
          blobUrl: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
      user: {
        select: {
          username: true,
          avatarUrl: true,
          avatarBlobUrl: true,
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
              avatarBlobUrl: true,
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

  return postsData.map((post) => {
    let displayImageUrl = post.imageBlobUrl;
    if (!displayImageUrl) {
        displayImageUrl = (post.imageUrl?.startsWith("data:") ? post.imageUrl : `/api/image/post-${post.id}.png`);
    }

    const userAvatar = post.user.avatarBlobUrl ||
       (post.user.avatarUrl ?
         (post.user.avatarUrl.startsWith("data:") ? post.user.avatarUrl : `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}`)
         : null);

    return {
        ...post,
        imageUrl: displayImageUrl!,
        user: {
          ...post.user,
          avatarUrl: userAvatar,
        },
        images: post.images.map(img => ({
            ...img,
            url: img.blobUrl || img.url || ''
        })),
        comments: post.comments.map(c => ({
            ...c,
            user: {
                ...c.user,
                avatarUrl: c.user.avatarBlobUrl ||
                   (c.user.avatarUrl ?
                     (c.user.avatarUrl.startsWith("data:") ? c.user.avatarUrl : `/api/avatar/${c.user.username}?v=${Date.now()}`)
                     : null)
            }
        })),
        likesCount: post._count.likes,
        hasLiked: post.likes.length > 0,
        likes: undefined,
        _count: undefined,
    };
  });
}

export async function fetchLikedPosts({
  userId,
  cursorId,
}: {
  userId: number;
  cursorId?: number;
}) {
  const session = await getSession();

  if (!session || session.id !== userId) return [];

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
            imageUrl: true,
            imageBlobUrl: true,
            comment: true,
            createdAt: true,
            userId: true,
            hashtags: {
                select: { name: true }
            },
            images: {
                select: { id: true, order: true, url: true, blobUrl: true },
                orderBy: { order: 'asc' }
            },
            user: {
                select: {
                    username: true,
                    avatarUrl: true,
                    avatarBlobUrl: true,
                    updatedAt: true,
                    isVerified: true,
                    isGold: true,
                }
            },
            comments: {
                select: {
                    id: true,
                    text: true,
                    userId: true,
                    user: {
                        select: { username: true, avatarUrl: true, avatarBlobUrl: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            _count: {
                select: { likes: true }
            },
            likes: {
                where: { userId: session.id },
                select: { userId: true }
            }
        }
      }
    }
  });

  return likedPostsData.map((item) => {
    const post = item.post;
    let displayImageUrl = post.imageBlobUrl;
    if (!displayImageUrl) {
        displayImageUrl = (post.imageUrl?.startsWith("data:") ? post.imageUrl : `/api/image/post-${post.id}.png`);
    }
    const userAvatar = post.user.avatarBlobUrl ||
       (post.user.avatarUrl ?
         (post.user.avatarUrl.startsWith("data:") ? post.user.avatarUrl : `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}`)
         : null);

    return {
        ...post,
        imageUrl: displayImageUrl!,
        user: {
          ...post.user,
          avatarUrl: userAvatar,
        },
        images: post.images.map(img => ({
            ...img,
            url: img.blobUrl || img.url || ''
        })),
        comments: post.comments.map(c => ({
            ...c,
            user: {
                ...c.user,
                avatarUrl: c.user.avatarBlobUrl ||
                   (c.user.avatarUrl ?
                     (c.user.avatarUrl.startsWith("data:") ? c.user.avatarUrl : `/api/avatar/${c.user.username}?v=${Date.now()}`)
                     : null)
            }
        })),
        likesCount: post._count.likes,
        hasLiked: post.likes.length > 0,
        likes: undefined,
        _count: undefined,
    };
  });
}

export async function createPost(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const imageUrlsJson = formData.get("imageUrls") as string;
  const comment = formData.get("comment") as string;
  const hashtagsRaw = formData.get("hashtags") as string;

  // We expect imageUrlsJson to be a JSON string of string[] (Blob URLs or Base64 if fallback)
  // With client-upload, these are Blob URLs.
  let imageUrls: string[] = [];
  if (imageUrlsJson) {
      try {
          imageUrls = JSON.parse(imageUrlsJson);
      } catch (e) {
          console.error("Failed to parse imageUrls", e);
      }
  }

  // Fallback for direct formData field (deprecated by client-upload, but good for robustness)
  const imageUrl = formData.get("imageUrl") as string;
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
    // With client-side upload, imageUrls are already Blob URLs.
    // However, if the client logic failed and sent base64, we should probably handle it or error.
    // But assuming client side works, we just save them.
    // If we want to support both (backward compat), we check if it is a Blob URL.

    // Check if first image is base64 (legacy fallback)
    // Note: User explicitly asked to "Client Upload", so we assume URLs are blob urls.
    // But for robustness:
    const isBlobUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') || url.startsWith('/'); // Vercel blob urls start with https://

    // Actually, `upload` from client returns https URLs.

    const [firstImage, ...restImages] = imageUrls;

    await db.post.create({
      data: {
        imageUrl: undefined,
        imageBlobUrl: firstImage, // Save the URL directly
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
                url: undefined,
                blobUrl: url,
                order: index + 1,
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
