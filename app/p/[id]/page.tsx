import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Feed from '@/components/Feed'; // Reuse Feed for single post view? Or create simple view.
// Feed expects array of posts, so we can pass single post array.
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) return {};

  const post = await db.post.findUnique({
    where: { id },
    select: {
      comment: true,
      user: {
        select: { username: true }
      }
    }
  });

  if (!post) return {};

  return {
    title: `Post by @${post.user.username} - INASTA`,
    description: post.comment || `Check out @${post.user.username}'s photo on INASTA`,
    openGraph: {
      images: [`/api/image/${id}`],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/image/${id}`],
    }
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) notFound();

  const session = await getSession();

  const postData = await db.post.findUnique({
    where: { id },
    select: {
      id: true,
      imageUrl: true,
      comment: true,
      userId: true,
      user: {
          select: {
              username: true,
              avatarUrl: true,
              isVerified: true
          }
      },
      _count: {
          select: { likes: true }
      },
      likes: {
          where: { userId: session?.id ?? -1 },
          select: { userId: true }
      }
    }
  });

  if (!postData) notFound();

  const post = {
      ...postData,
      likesCount: postData._count.likes,
      hasLiked: postData.likes.length > 0,
      likes: undefined,
      _count: undefined,
      // We still pass imageUrl (Data URI) to Feed because Feed uses it for <img> src?
      // No, we are changing Feed to use /api/image/[id]!
      // But we should probably keep passing it or just pass ID.
      // Wait, if we change Feed to use /api/image/[id], we don't need the full Data URI in the prop.
      // However, for compatibility with optimistic updates (if we had any new uploads), Data URI is useful.
      // But here we are fetching from DB.
      // Let's pass the Data URI but Feed will ignore it for the main image src if we switch logic.
      // OR, we update the object to set imageUrl to the API route here?
      // Better: Update Feed to prefer API route if ID exists.
      // Actually, Feed component renders images.
      // If we change Feed logic, it affects everywhere.
      // Let's modify Feed to render `/api/image/${post.id}`.
      // But `initialPosts` passed to Feed has `imageUrl`.
      // We can override `imageUrl` in the mapped object here.
      imageUrl: `/api/image/${postData.id}` 
  };

  return (
    <div className="min-h-screen bg-white">
       <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center shadow-sm">
         <Link href="/" className="text-gray-700 hover:text-black mr-4">
            <ArrowLeft className="w-6 h-6" />
         </Link>
         <h1 className="text-lg font-bold">Post</h1>
      </div>
      <div className="pt-4">
         <Feed initialPosts={[post]} currentUserId={session?.id ?? -1} />
      </div>
    </div>
  );
}
