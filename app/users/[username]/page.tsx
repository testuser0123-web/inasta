import { db } from '@/lib/db';
import Feed from '@/components/Feed';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Params = Promise<{ username: string }>;

export default async function UserProfilePage({ params }: { params: Params }) {
  const { username } = await params;
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
    }
  });

  if (!user) {
    notFound();
  }

  // Redirect to my profile if it's the current user
  if (user.id === session.id) {
    redirect('/profile');
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
          where: { userId: session.id },
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
         <h1 className="text-lg font-bold">{user.username}</h1>
      </div>
      
      <div className="p-4 flex flex-col items-center border-b mb-1">
         <div className="w-20 h-20 bg-gray-200 rounded-full mb-2 overflow-hidden">
             {user.avatarUrl ? (
                 // eslint-disable-next-line @next/next/no-img-element
                 <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
                    {user.username[0].toUpperCase()}
                </div>
             )}
         </div>
         <h2 className="font-semibold text-lg">@{user.username}</h2>
         <p className="text-sm text-gray-500">{posts.length} posts</p>
      </div>

      <Feed initialPosts={posts} currentUserId={session.id} />
    </main>
  );
}