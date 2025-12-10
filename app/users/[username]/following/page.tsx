import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import UserList from '@/components/UserList';

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams.username);

  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    notFound();
  }

  const following = await db.follow.findMany({
    where: { followerId: user.id },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          updatedAt: true,
          isVerified: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const users = following.map((f) => ({
    ...f.following,
    avatarUrl: f.following.avatarUrl ? `/api/avatar/${f.following.username}?v=${f.following.updatedAt.getTime()}` : null,
  }));

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b dark:border-gray-800 px-4 py-3 flex items-center shadow-sm">
        <Link href={`/users/${username}`} className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white mr-4">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
           <h1 className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</h1>
           <h2 className="text-lg font-bold dark:text-white">Following</h2>
        </div>
      </div>
      <UserList users={users} />
    </main>
  );
}
