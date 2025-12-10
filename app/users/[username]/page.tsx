import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import ProfileClient from '@/app/profile/ProfileClient';

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
      avatarBlobUrl: true,
      updatedAt: true,
      isVerified: true,
      isGold: true,
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

  const userAvatar = userData?.avatarBlobUrl ||
       (userData?.avatarUrl ?
         (userData.avatarUrl.startsWith("data:") ? userData.avatarUrl : `/api/avatar/${userData.username}?v=${userData.updatedAt.getTime()}`)
         : null);

  const user = userData ? {
      ...userData,
      avatarUrl: userAvatar
  } : null;

  if (!user) {
    notFound();
  }

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
      imageBlobUrl: true,
      comment: true,
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
              url: true,
              blobUrl: true
          },
          orderBy: {
              order: 'asc'
          }
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
                    avatarBlobUrl: true
                }
            }
        },
        orderBy: { createdAt: 'asc' }
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
      _count: {
          select: { likes: true }
      },
      likes: {
          where: { userId: session?.id ?? -1 },
          select: { userId: true }
      }
    },
  });

  const posts = postsData.map(post => {
      let displayImageUrl = post.imageBlobUrl || (post.imageUrl.startsWith("data:") ? post.imageUrl : `/api/image/post-${post.id}.png`);
      const userAvatar = post.user.avatarBlobUrl ||
       (post.user.avatarUrl ?
         (post.user.avatarUrl.startsWith("data:") ? post.user.avatarUrl : `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}`)
         : null);

      return {
          ...post,
          imageUrl: displayImageUrl,
          user: {
              ...post.user,
              avatarUrl: userAvatar
          },
          images: post.images.map(img => ({
              ...img,
              url: img.blobUrl || img.url
          })),
          likesCount: post._count.likes,
          hasLiked: post.likes.length > 0,
          likes: undefined,
          _count: undefined
      };
  });

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
                    imageBlobUrl: true,
                    comment: true,
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
                        url: true,
                        blobUrl: true
                    },
                    orderBy: {
                        order: 'asc'
                    }
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
                                avatarBlobUrl: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
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

      likedPosts = likedPostsData.map(item => {
          const post = item.post;
          let displayImageUrl = post.imageBlobUrl || (post.imageUrl.startsWith("data:") ? post.imageUrl : `/api/image/post-${post.id}.png`);
          const userAvatar = post.user.avatarBlobUrl ||
           (post.user.avatarUrl ?
             (post.user.avatarUrl.startsWith("data:") ? post.user.avatarUrl : `/api/avatar/${post.user.username}?v=${post.user.updatedAt.getTime()}`)
             : null);
          return {
              ...post,
              imageUrl: displayImageUrl,
              user: {
                  ...post.user,
                  avatarUrl: userAvatar
              },
              images: post.images.map(img => ({
                  ...img,
                  url: img.blobUrl || img.url
              })),
              likesCount: post._count.likes,
              hasLiked: post.likes.length > 0,
              likes: undefined,
              _count: undefined
          };
      });
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
          initialStatus={{
              isFollowing,
              isMuted,
              isMe
          }}
      />
    </main>
  );
}
