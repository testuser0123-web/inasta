import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Feed from '@/components/Feed'; // Reuse Feed for single post view? Or create simple view.
// Feed expects array of posts, so we can pass single post array.
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import { getBaseUrl } from '@/lib/url';

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

  const imageUrl = `${getBaseUrl()}/api/image/${id}.jpg`;

  return {
    title: `Post by @${post.user.username} - INASTA`,
    description: post.comment || `Check out @${post.user.username}'s photo on INASTA`,
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      images: [imageUrl],
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
      imageBlobUrl: true,
      comment: true,
      createdAt: true,
      userId: true,
      images: {
          select: {
              id: true,
              order: true,
              url: true,
              blobUrl: true
          },
          orderBy: {
              order: 'asc'
          }
      },
      user: {
          select: {
              username: true,
              avatarUrl: true,
              avatarBlobUrl: true,
              updatedAt: true,
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

  const displayImageUrl = postData.imageBlobUrl || (postData.imageUrl?.startsWith("data:") ? postData.imageUrl : `/api/image/post-${postData.id}.png`);

  const userAvatar = postData.user.avatarBlobUrl ||
       (postData.user.avatarUrl ?
         (postData.user.avatarUrl.startsWith("data:") ? postData.user.avatarUrl : `/api/avatar/${postData.user.username}?v=${postData.user.updatedAt.getTime()}`)
         : null);

  const post = {
      ...postData,
      imageUrl: displayImageUrl!,
      user: {
          ...postData.user,
          avatarUrl: userAvatar
      },
      images: postData.images.map(img => ({
          ...img,
          url: img.blobUrl || img.url || ''
      })),
      likesCount: postData._count.likes,
      hasLiked: postData.likes.length > 0,
      likes: undefined,
      _count: undefined,
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
