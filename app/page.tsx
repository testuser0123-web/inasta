import { db } from '@/lib/db';
import Feed from '@/components/Feed';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { User } from 'lucide-react';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ feed?: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const resolvedSearchParams = await searchParams;
  const feedType = resolvedSearchParams.feed === 'following' ? 'following' : 'all';

  // Get muted users to exclude
  const muted = await db.mute.findMany({
      where: { muterId: session.id },
      select: { mutedId: true }
  });
  const mutedIds = muted.map(m => m.mutedId);

  let whereClause: Prisma.PostWhereInput = {
      userId: { notIn: mutedIds }
  };


  if (feedType === 'following') {
      const following = await db.follow.findMany({
          where: { followerId: session.id },
          select: { followingId: true }
      });
      const followingIds = following.map(f => f.followingId);
      
      whereClause = {
          ...whereClause,
          userId: { in: followingIds, notIn: mutedIds }
      };
  }

  const postsData = await db.post.findMany({
    where: whereClause,
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
          where: { userId: session.id },
          select: { userId: true }
      }
    },
  });

  const posts = postsData.map(post => ({
      ...post,
      likesCount: post._count.likes,
      hasLiked: post.likes.length > 0,
      likes: undefined, // remove raw likes array
      _count: undefined // remove raw count
  }));

  return (
    <main className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
         <div className="px-4 py-3 flex items-center justify-between">
            <div className="w-6" /> {/* Spacer */}
            <h1 className="text-xl font-bold tracking-tighter italic">INASTA</h1>
            <Link href="/profile" className="text-gray-700 hover:text-black">
                <User className="w-6 h-6" />
            </Link>
         </div>
         
         {/* Tabs */}
         <div className="flex">
            <Link 
                href="/?feed=all" 
                className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-colors ${
                    feedType === 'all' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
            >
                ALL
            </Link>
            <Link 
                href="/?feed=following" 
                className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-colors ${
                    feedType === 'following' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
            >
                Following
            </Link>
         </div>
      </div>
      
      <Feed initialPosts={posts} currentUserId={session.id} />
    </main>
  );
}
