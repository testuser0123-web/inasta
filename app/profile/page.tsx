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

  const user = {
      ...userData,
      avatarUrl: userData.avatarUrl ? `/api/avatar/${userData.username}?v=${userData.updatedAt.getTime()}` : null
  };

  // Fetch my posts
  const myPostsData = await db.post.findMany({
    take: 12,
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      // imageUrl: true,
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
              order: true
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
                // imageUrl: true,
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
                        order: true
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
      user: {
          ...item.post.user,
          avatarUrl: item.post.user.avatarUrl ? `/api/avatar/${item.post.user.username}?v=${item.post.user.updatedAt.getTime()}` : null
      },
      likesCount: item.post._count.likes,
      hasLiked: item.post.likes.length > 0,
      likes: undefined,
      _count: undefined
  }));

  // Fetch trophies
  // We need to find contests that have ended, and check ranks.
  // This might be heavy if done naively.
  // Ideally, we store "Winner" status in DB. But request says "Non-destructively".
  // So we compute on fly or assume efficient enough for now.
  // Optimization: Only fetch ended contests where user has posted.

  const userContestPosts = await db.contestPost.findMany({
    where: {
        userId: user.id,
        contest: {
            endDate: { lt: new Date() }
        }
    },
    select: {
        id: true,
        contestId: true
    }
  });

  const contestIds = Array.from(new Set(userContestPosts.map(p => p.contestId)));

  let trophies = { gold: 0, silver: 0, bronze: 0 };

  for (const contestId of contestIds) {
      // Get top 3 posts for this contest
      const winners = await db.contestPost.findMany({
          where: { contestId },
          orderBy: [
              { likes: { _count: 'desc' } },
              { createdAt: 'asc' }
          ],
          take: 3,
          select: { userId: true }
      });

      winners.forEach((winner, index) => {
          if (winner.userId === user.id) {
              if (index === 0) trophies.gold++;
              else if (index === 1) trophies.silver++;
              else if (index === 2) trophies.bronze++;
          }
      });
  }

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
          trophies={trophies}
      />
    </main>
  );
}
