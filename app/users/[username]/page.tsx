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
      isVerified: true,
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
      avatarUrl: userData.avatarUrl ? `/api/avatar/${userData.username}` : null
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
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      // imageUrl: true,
      comment: true,
      userId: true,
      user: {
          select: {
              username: true,
              avatarUrl: true
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
          avatarUrl: post.user.avatarUrl ? `/api/avatar/${post.user.username}` : null
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
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          select: {
              post: {
                  select: {
                    id: true,
                    // imageUrl: true,
                    comment: true,
                    userId: true,
                    user: {
                        select: {
                            username: true,
                            avatarUrl: true
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
              avatarUrl: item.post.user.avatarUrl ? `/api/avatar/${item.post.user.username}` : null
          },
          likesCount: item.post._count.likes,
          hasLiked: item.post.likes.length > 0,
          likes: undefined,
          _count: undefined
      }));
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center shadow-sm">
         <Link href="/" className="text-gray-700 hover:text-black mr-4">
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