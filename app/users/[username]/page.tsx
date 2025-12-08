import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Feed from '@/components/Feed';
import { getSession } from '@/lib/auth';
import ProfileHeader from '@/components/ProfileHeader';

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = await params;
  const username = resolvedParams.username;
  const session = await getSession();

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      _count: {
          select: {
              followers: true,
              following: true
          }
      }
    },
  });

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
      imageUrl: true,
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
      likesCount: post._count.likes,
      hasLiked: post.likes.length > 0,
      likes: undefined,
      _count: undefined
  }));

  return (
    <main className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center shadow-sm">
         <Link href="/" className="text-gray-700 hover:text-black mr-4">
            <ArrowLeft className="w-6 h-6" />
         </Link>
         <h1 className="text-lg font-bold">@{user.username}</h1>
      </div>

      <div className="pt-6">
        <ProfileHeader 
            user={user} 
            currentUser={session ? { id: session.id, username: session.username } : null}
            initialCounts={{
                followers: user._count.followers,
                following: user._count.following
            }}
            initialStatus={{
                isFollowing,
                isMuted,
                isMe
            }}
        />
        <div className="border-t">
             <Feed initialPosts={posts} currentUserId={session?.id ?? -1} />
        </div>
      </div>
    </main>
  );
}