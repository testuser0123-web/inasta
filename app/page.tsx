import { db } from '@/lib/db';
import Feed from '@/components/Feed';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { User } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const postsData = await db.post.findMany({
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
      <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
         <div className="w-6" /> {/* Spacer for centering */}
         <h1 className="text-xl font-bold tracking-tighter italic">INASTA</h1>
         <Link href="/profile" className="text-gray-700 hover:text-black">
            <User className="w-6 h-6" />
         </Link>
      </div>
      <Feed initialPosts={posts} currentUserId={session.id} />
    </main>
  );
}
