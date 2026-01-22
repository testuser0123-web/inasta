"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import cloudinary from "@/lib/cloudinary";
import { enrichUser, canUseFrame } from "@/lib/user_logic";

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
  const currentUserId = session ? session.id : -1;

  // Get muted users to exclude (only if logged in)
  let mutedIds: number[] = [];
  if (session) {
    const muted = await db.mute.findMany({
        where: { muterId: session.id },
        select: { mutedId: true },
    });
    mutedIds = muted.map((m) => m.mutedId);
  }

  // Check user settings for excluding unverified posts
  let excludeUnverifiedPosts = false;
  if (session) {
      const user = await db.user.findUnique({
        where: { id: session.id },
        select: { excludeUnverifiedPosts: true },
      });
      excludeUnverifiedPosts = user?.excludeUnverifiedPosts ?? false;
  }

  let whereClause: Prisma.PostWhereInput = {
    userId: { notIn: mutedIds },
  };

  if (feedType === "all" && excludeUnverifiedPosts) {
     whereClause = {
         ...whereClause,
         user: {
             isVerified: true
         }
     };
  }

  if (feedType === "following") {
    // If guest tries to access following feed, return empty (handled in UI mostly)
    if (!session) return [];

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

  try {
    const postsData = await db.post.findMany({
      take: 12,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        imageUrl: true,
        mediaType: true,
        thumbnailUrl: true,
        frameColor: true,
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
            url: true,
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
            subscriptionAmount: true,
            subscriptionExpiresAt: true,
          },
        },
        // Removed comments fetch for feed optimization
        _count: {
          select: { likes: true },
        },
        likes: {
          where: { userId: currentUserId },
          select: { userId: true },
        },
      },
    });

    return postsData.map((post) => ({
      ...post,
      imageUrl: post.imageUrl && post.imageUrl.startsWith('http')
          ? post.imageUrl
          : `/api/image/${post.id}.jpg`,
      thumbnailUrl: post.thumbnailUrl
        ? (post.thumbnailUrl.startsWith('http') ? post.thumbnailUrl : `/api/post_thumbnail/${post.id}.jpg`)
        : null,
      images: post.images.map(img => ({
        ...img,
        url: img.url && img.url.startsWith('http') ? img.url : `/api/post_image/${img.id}.jpg`
      })),
      user: enrichUser({
        ...post.user,
        avatarUrl: post.user.avatarUrl
          ? (post.user.avatarUrl.startsWith('http')
               ? post.user.avatarUrl
               : `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}`)
          : null,
      }),
      likesCount: post._count.likes,
      hasLiked: post.likes.length > 0,
      likes: undefined,
      _count: undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch feed posts:", error);
    return [];
  }
}

export async function fetchUserPosts({
  userId,
  cursorId,
}: {
  userId: number;
  cursorId?: number;
}) {
  const session = await getSession();
  const currentUserId = session ? session.id : -1;

  try {
    const postsData = await db.post.findMany({
      take: 12,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        imageUrl: true,
        mediaType: true,
        thumbnailUrl: true,
        frameColor: true,
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
            url: true,
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
            subscriptionAmount: true,
            subscriptionExpiresAt: true,
          },
        },
        _count: {
          select: { likes: true },
        },
        likes: {
          where: { userId: currentUserId },
          select: { userId: true },
        },
      },
    });

    return postsData.map((post) => ({
      ...post,
      imageUrl: post.imageUrl && post.imageUrl.startsWith('http')
          ? post.imageUrl
          : `/api/image/${post.id}.jpg`,
      thumbnailUrl: post.thumbnailUrl
        ? (post.thumbnailUrl.startsWith('http') ? post.thumbnailUrl : `/api/post_thumbnail/${post.id}.jpg`)
        : null,
      images: post.images.map(img => ({
        ...img,
        url: img.url && img.url.startsWith('http') ? img.url : `/api/post_image/${img.id}.jpg`
      })),
      user: enrichUser({
        ...post.user,
        avatarUrl: post.user.avatarUrl
          ? (post.user.avatarUrl.startsWith('http')
               ? post.user.avatarUrl
               : `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}`)
          : null,
      }),
      likesCount: post._count.likes,
      hasLiked: post.likes.length > 0,
      likes: undefined,
      _count: undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch user posts:", error);
    return [];
  }
}

export async function fetchLikedPosts({
  userId,
  cursorId,
}: {
  userId: number;
  cursorId?: number;
}) {
  const session = await getSession();
  // Guests cannot view their liked posts as they have none/no profile page.
  // Viewing other user's liked posts might be allowed? The function checks `session.id !== userId` to restrict viewing others likes?
  // Previous code: `if (!session || session.id !== userId) return [];`
  // This implies users can only see their own liked posts.
  // So for guests, this should definitely return empty.
  if (!session || session.id !== userId) return [];

  try {
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
              mediaType: true,
              thumbnailUrl: true,
              frameColor: true,
              comment: true,
              isSpoiler: true,
              createdAt: true,
              userId: true,
              hashtags: {
                  select: { name: true }
              },
              images: {
                  select: { id: true, order: true, url: true },
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
                      subscriptionAmount: true,
                      subscriptionExpiresAt: true,
                  }
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

    return likedPostsData.map((item) => ({
      ...item.post,
      imageUrl: item.post.imageUrl && item.post.imageUrl.startsWith('http')
          ? item.post.imageUrl
          : `/api/image/${item.post.id}.jpg`,
      thumbnailUrl: item.post.thumbnailUrl
        ? (item.post.thumbnailUrl.startsWith('http') ? item.post.thumbnailUrl : `/api/post_thumbnail/${item.post.id}.jpg`)
        : null,
      images: item.post.images.map(img => ({
        ...img,
        url: img.url && img.url.startsWith('http') ? img.url : `/api/post_image/${img.id}.jpg`
      })),
      user: enrichUser({
        ...item.post.user,
        avatarUrl: item.post.user.avatarUrl
          ? (item.post.user.avatarUrl.startsWith('http')
               ? item.post.user.avatarUrl
               : `/api/avatar/${item.post.user.username}?v=${item.post.user.updatedAt.getTime()}`)
          : null,
      }),
      likesCount: item.post._count.likes,
      hasLiked: item.post.likes.length > 0,
      likes: undefined,
      _count: undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch liked posts:", error);
    return [];
  }
}

export async function createPost(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { message: "Unauthorized" };
  }
  // ... existing code ...
  const imageUrlsJson = formData.get("imageUrls") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const comment = formData.get("comment") as string;
  const hashtagsRaw = formData.get("hashtags") as string;
  const isSpoiler = formData.get("isSpoiler") === "true";

  const mediaTypeRaw = formData.get("mediaType") as string;
  const mediaType = (mediaTypeRaw === "VIDEO" ? "VIDEO" : "IMAGE") as "VIDEO" | "IMAGE";
  const thumbnailUrl = formData.get("thumbnailUrl") as string | null;
  const frameColorRaw = formData.get("frameColor") as string | null;

  let imageUrls: string[] = [];
  if (imageUrlsJson) {
      try {
          imageUrls = JSON.parse(imageUrlsJson);
      } catch (e) {
          console.error("Failed to parse imageUrls", e);
      }
  }

  if (imageUrls.length === 0 && imageUrl) {
      imageUrls = [imageUrl];
  }

  if (imageUrls.length === 0) {
    return { message: "Image/Video is required" };
  }

  if (comment && comment.length > 173) {
    return { message: "コメントが長すぎます(173文字まで)" };
  }

  let hashtagList: string[] = [];
  if (hashtagsRaw) {
    hashtagList = hashtagsRaw
      .split(" ")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

    hashtagList = Array.from(new Set(hashtagList));

    if (hashtagList.length > 3) {
      return { message: "ハッシュタグは3つまでです" };
    }
  }

  try {
    const [firstImage, ...restImages] = imageUrls;

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { roles: true, subscriptionAmount: true, subscriptionExpiresAt: true },
    });

    let frameColor = null;
    if (frameColorRaw && user && canUseFrame(user)) {
      frameColor = frameColorRaw;
    }

    await db.post.create({
      data: {
        imageUrl: firstImage,
        mediaType,
        thumbnailUrl,
        frameColor,
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
                order: index + 1,
            }))
        }
      },
    });

    if (user && !user.roles.includes('inastagrammer')) {
      const postCount = await db.post.count({
        where: { userId: session.id },
      });

      if (postCount >= 17) {
        await db.user.update({
          where: { id: session.id },
          data: {
            roles: {
              push: 'inastagrammer',
            },
          },
        });
      }
    }
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
  if (!session) return; // Guest check: silent fail or handle in UI

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

  if (post.mediaType === "VIDEO" && post.imageUrl) {
    try {
      const matches = post.imageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      if (matches && matches[1]) {
        const publicId = matches[1];
        console.log(`Deleting video from Cloudinary. Public ID: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        console.log('Cloudinary deletion result:', result);
      } else {
        console.warn('Could not extract public ID from Cloudinary URL:', post.imageUrl);
      }
    } catch (error) {
      console.error("Failed to delete video from Cloudinary:", error);
    }
  }

  await db.post.delete({
    where: { id: postId },
  });

  revalidatePath("/");
  revalidatePath("/profile");
}
