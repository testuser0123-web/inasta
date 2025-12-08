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

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      isVerified: true,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  });

  if (!user) redirect('/login');

  // Fetch my posts
  const myPostsData = await db.post.findMany({
    where: { userId: session.id },
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

  const myPosts = myPostsData.map(post => ({
      ...post,
      likesCount: post._count.likes,
      hasLiked: post.likes.length > 0,
      likes: undefined,
      _count: undefined
  }));

  // Fetch liked posts
  const likedPostsData = await db.like.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      select: {
          post: {
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
              }
          }
      }
  });

  const likedPosts = likedPostsData.map(item => ({
      ...item.post,
      likesCount: item.post._count.likes,
      hasLiked: item.post.likes.length > 0,
      likes: undefined,
      _count: undefined
  }));

  return (
    <main className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
         <Link href="/" className="text-gray-700 hover:text-black">
            <ArrowLeft className="w-6 h-6" />
         </Link>
         <h1 className="text-lg font-bold">My Page</h1>
         <form action={async () => {
             'use server';
             await logout();
             redirect('/login');
         }}>
             <button type="submit" className="text-gray-700 hover:text-red-500">
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
      />
    </main>
  );
}