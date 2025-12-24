import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import SinglePost from '@/components/SinglePost';
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
      imageUrl: true,
      user: {
        select: { username: true }
      }
    }
  });

  if (!post) return {};

  const imageUrl = (post.imageUrl && post.imageUrl.startsWith('http'))
    ? post.imageUrl
    : `${getBaseUrl()}/api/image/${id}.jpg`;

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
      mediaType: true,
      thumbnailUrl: true,
      comment: true,
      createdAt: true,
      userId: true,
      images: {
          select: {
              id: true,
              order: true,
              url: true
          },
          orderBy: {
              order: 'asc'
          }
      },
      user: {
          select: {
              username: true,
              avatarUrl: true,
              updatedAt: true,
              isVerified: true,
              isGold: true,
              roles: true
          }
      },
      _count: {
          select: { likes: true }
      },
      likes: {
          where: { userId: session?.id ?? -1 },
          select: { userId: true }
      },
      hashtags: {
          select: { name: true }
      },
      isSpoiler: true,
      comments: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          text: true,
          userId: true,
          user: {
            select: {
              username: true,
              avatarUrl: true,
              updatedAt: true
            }
          }
        }
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
      imageUrl: (postData.imageUrl && postData.imageUrl.startsWith('http'))
          ? postData.imageUrl
          : `/api/image/${postData.id}.jpg`,
      thumbnailUrl: postData.thumbnailUrl
          ? (postData.thumbnailUrl.startsWith('http')
              ? postData.thumbnailUrl
              : `/api/post_thumbnail/${postData.id}.jpg`)
          : null,
      images: postData.images.map(img => ({
          ...img,
          url: (img.url && img.url.startsWith('http'))
              ? img.url
              : `/api/post_image/${img.id}.jpg`
      })),
      user: {
          ...postData.user,
          avatarUrl: postData.user.avatarUrl
              ? postData.user.avatarUrl.startsWith('http')
                  ? postData.user.avatarUrl
                  : `/api/avatar/${postData.user.username}?v=${postData.user.updatedAt.getTime()}`
              : null
      },
      comments: postData.comments.map(comment => ({
          ...comment,
          user: {
              ...comment.user,
              avatarUrl: comment.user.avatarUrl
                  ? comment.user.avatarUrl.startsWith('http')
                      ? comment.user.avatarUrl
                      : `/api/avatar/${comment.user.username}?v=${comment.user.updatedAt.getTime()}`
                  : null
          }
      }))
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
       <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-4 py-3 flex items-center shadow-sm">
         <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white mr-4">
            <ArrowLeft className="w-6 h-6" />
         </Link>
         <h1 className="text-lg font-bold">Post</h1>
      </div>
      <div className="pt-4 pb-20">
         <SinglePost initialPost={post} currentUserId={session?.id ?? -1} />
      </div>
    </div>
  );
}
