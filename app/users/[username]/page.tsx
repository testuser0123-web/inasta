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

  const user = userData ? {
      ...userData,
      avatarUrl: userData.avatarUrl ? `/api/avatar/${userData.username}?v=${userData.updatedAt.getTime()}` : null
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
          where: { userId: session?.id ?? -1 },
          select: { userId: true }
      }
    },
  });

  const posts = postsData.map(post => ({
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
                        where: { userId: user.id },
                        select: { userId: true }
                    }
                  }
              }
          }
      });

      likedPosts = likedPostsData.map(item => ({
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
  }

  // Fetch trophies using raw query for performance
  const trophyCounts = await db.$queryRaw<Array<{ rank: bigint, count: bigint }>>`
    SELECT
      rank,
      CAST(COUNT(*) AS INTEGER) as count
    FROM (
      SELECT
        cp."contestId",
        cp."userId",
        RANK() OVER (
          PARTITION BY cp."contestId"
          ORDER BY COUNT(cl.id) DESC, cp."createdAt" ASC
        ) as rank
      FROM "ContestPost" cp
      JOIN "Contest" c ON cp."contestId" = c.id
      LEFT JOIN "ContestLike" cl ON cp.id = cl."contestPostId"
      WHERE c."endDate" < NOW()
      GROUP BY cp.id, cp."contestId", cp."userId", cp."createdAt"
    ) ranking
    WHERE "userId" = ${user.id} AND rank <= 3
    GROUP BY rank
  `;

  const trophies = { gold: 0, silver: 0, bronze: 0 };
  if (Array.isArray(trophyCounts)) {
    trophyCounts.forEach(t => {
        const r = Number(t.rank);
        const c = Number(t.count);
        if (r === 1) trophies.gold = c;
        else if (r === 2) trophies.silver = c;
        else if (r === 3) trophies.bronze = c;
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
          trophies={trophies}
      />
    </main>
  );
}
