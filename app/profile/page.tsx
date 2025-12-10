import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession, logout } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userData = await db.user.findUnique({
    where: { id: session.id },
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
          following: true,
        },
      },
    },
  });

  if (!userData) redirect('/login');

  const userAvatar = userData.avatarBlobUrl ||
       (userData.avatarUrl ?
         (userData.avatarUrl.startsWith("data:") ? userData.avatarUrl : `/api/avatar/${userData.username}?v=${userData.updatedAt.getTime()}`)
         : null);

  const user = {
      ...userData,
      avatarUrl: userAvatar
  };

  // Fetch my posts
  const myPostsData = await db.post.findMany({
    take: 12,
    where: { userId: session.id },
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
          where: { userId: session.id },
          select: { userId: true }
      }
    },
  });

  const myPosts = myPostsData.map(post => {
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

  // Fetch liked posts
  const likedPostsData = await db.like.findMany({
      take: 12,
      where: { userId: session.id },
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
                    where: { userId: session.id },
                    select: { userId: true }
                }
              }
          }
      }
  });

  const likedPosts = likedPostsData.map(item => {
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

  return (
    <main className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100">
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-sm">
         <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white">
            <ArrowLeft className="w-6 h-6" />
         </Link>
         <h1 className="text-lg font-bold">My Page</h1>
         <form action={async () => {
             'use server';
             await logout();
             redirect('/login');
         }}>
             <button type="submit" className="text-gray-700 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400">
                <LogOut className="w-6 h-6" />
             </button>
         </form>
      </div>
      
      <ProfileClient 
          user={user} 
          currentUser={{ id: session.id, username: session.username }}
          posts={myPosts} 
          likedPosts={likedPosts} 
          initialStatus={{
              isFollowing: false,
              isMuted: false,
              isMe: true
          }}
      />
    </main>
  );
}
