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
          isVerified: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const users = following.map((f) => f.following);

  return (
    <main className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center shadow-sm">
        <Link href={`/users/${username}`} className="text-gray-700 hover:text-black mr-4">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
           <h1 className="text-sm text-gray-500">@{user.username}</h1>
           <h2 className="text-lg font-bold">Following</h2>
        </div>
      </div>
      <UserList users={users} />
    </main>
  );
}
