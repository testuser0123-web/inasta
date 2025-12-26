import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/logout';
import { getUserTrophies } from '@/app/actions/trophy';
import { getDiariesByUser } from '@/app/actions/diary';

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

  if (!userData) {
      redirect('/login');
  }

  const user = {
      ...userData,
      avatarUrl: userData?.avatarUrl ? `/api/avatar/${userData.username}?v=${userData.updatedAt.getTime()}` : null
  };

  const trophies = await getUserTrophies(session.id);
  const diaries = await getDiariesByUser(session.id);

  // Fetch my posts
  const myPostsData = await db.post.findMany({
    take: 12,
    where: { userId: session.id },
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
      comments: {
        select: {
            id: true,
            text: true,
            userId: true,
            user: {
                select: {
                    username: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: { createdAt: 'asc' }
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
      _count: {
          select: { likes: true }
      },
      likes: {
          where: { userId: session.id },
          select: { userId: true }
      }
    },
  });

  const myPosts = myPostsData.map(post => ({
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
                comments: {
                    select: {
                        id: true,
                        text: true,
                        userId: true,
                        user: {
                            select: {
                                username: true,
                                avatarUrl: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
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

  const likedPosts = likedPostsData.map(item => ({
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
          diaries={diaries}
          initialStatus={{
              isFollowing: false,
              isMuted: false,
              isMe: true
          }}
          trophies={trophies}
      />
    </main>
  );
}
