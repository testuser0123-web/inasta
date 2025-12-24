import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import ProfileClient from '@/app/profile/ProfileClient';
import { getUserTrophies } from '@/app/actions/trophy';
import { getDiariesByUser } from '@/app/actions/diary';

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams.username);
  const session = await getSession();

  const userData = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      updatedAt: true,
      isVerified: true,
      isGold: true,
      roles: true,
      bio: true,
      oshi: true,
      _count: {
          select: {
              followers: true,
              following: true
          }
      }
    },
  });

  const user = userData ? {
      ...userData,
      avatarUrl: userData.avatarUrl ? `/api/avatar/${userData.username}?v=${userData.updatedAt.getTime()}` : null
  } : null;

  if (!user) {
    notFound();
  }

  // Fetch trophies
  const trophies = await getUserTrophies(user.id);

  // Fetch diaries
  const diaries = await getDiariesByUser(user.id);

  // Check relationship status if logged in
  let isFollowing = false;
  let isMuted = false;
  const isMe = session?.id === user.id;

  if (session && !isMe) {
      const follow = await db.follow.findUnique({
          where: {
              followerId_followingId: {
                  followerId: session.id,
                  followingId: user.id
              }
          }
      });
      isFollowing = !!follow;

      const mute = await db.mute.findUnique({
          where: {
              muterId_mutedId: {
                  muterId: session.id,
                  mutedId: user.id
              }
          }
      });
      isMuted = !!mute;
  }

  const postsData = await db.post.findMany({
    take: 12,
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      imageUrl: true,
      mediaType: true,
      thumbnailUrl: true,
      comment: true,
      isSpoiler: true,
      createdAt: true,
      userId: true,
      hashtags: {
        select: {
            name: true
        }
      },
      images: {
          select: {
              id: true,
              order: true,
              url: true
          },
          orderBy: {
              order: 'asc'
          }
      },
      // comments removed
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
      _count: {
          select: { likes: true }
      },
      likes: {
          where: { userId: session?.id ?? -1 },
          select: { userId: true }
      }
    },
  });

  const posts = postsData.map(post => ({
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
      user: {
          ...post.user,
          avatarUrl: post.user.avatarUrl ? `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}` : null
      },
      likesCount: post._count.likes,
      hasLiked: post.likes.length > 0,
      likes: undefined,
      _count: undefined
  }));

  let likedPosts: typeof posts = [];
  if (isMe) {
      // Fetch liked posts only if viewing own profile
      const likedPostsData = await db.like.findMany({
          take: 12,
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          select: {
              post: {
                  select: {
                    id: true,
                    imageUrl: true,
                    mediaType: true,
                    thumbnailUrl: true,
                    comment: true,
                    isSpoiler: true,
                    createdAt: true,
                    userId: true,
                hashtags: {
                    select: {
                        name: true
                    }
                },
                images: {
                    select: {
                        id: true,
                        order: true,
                        url: true
                    },
                    orderBy: {
                        order: 'asc'
                    }
                },
                // comments removed
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
                    _count: {
                        select: { likes: true }
                    },
                    likes: {
                        where: { userId: user.id },
                        select: { userId: true }
                    }
                  }
              }
          }
      });

      likedPosts = likedPostsData.map(item => ({
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
          user: {
              ...item.post.user,
              avatarUrl: item.post.user.avatarUrl ? `/api/avatar/${item.post.user.username}?v=${item.post.user.updatedAt.getTime()}` : null
          },
          likesCount: item.post._count.likes,
          hasLiked: item.post.likes.length > 0,
          likes: undefined,
          _count: undefined
      }));
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100">
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b dark:border-gray-800 px-4 py-3 flex items-center shadow-sm">
         <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white mr-4">
            <ArrowLeft className="w-6 h-6" />
         </Link>
         <h1 className="text-lg font-bold">@{user.username}</h1>
      </div>

      <ProfileClient 
          key={user.id}
          user={user}
          currentUser={session ? { id: session.id, username: session.username } : null}
          posts={posts}
          likedPosts={likedPosts}
          diaries={diaries}
          initialStatus={{
              isFollowing,
              isMuted,
              isMe
          }}
          trophies={trophies}
      />
    </main>
  );
}
