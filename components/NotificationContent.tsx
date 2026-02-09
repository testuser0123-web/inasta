'use client';

import { NotificationType } from '@prisma/client';
import Link from 'next/link';

export type NotificationMetadata = {
  contestId?: number;
  contestTitle?: string;
  diaryId?: number;
  diaryTitle?: string;
  postId?: number;
} | null;

export type Notification = {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  content: string | null;
  isRead: boolean;
  createdAt: Date;
  metadata: NotificationMetadata | unknown;
};

// Helper function to render content with clickable links
export function RenderNotificationContent({ notification }: { notification: Notification }) {
  if (!notification.content) return null;

  const metadata = notification.metadata as NotificationMetadata;
  const content = notification.content;

  if (metadata?.contestId && metadata.contestTitle) {
    const title = metadata.contestTitle;
    const parts = content.split(`「${title}」`);

    // Safety check: if split didn't find the exact quoted title
    if (parts.length < 2) return <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">{content}</p>;

    return (
      <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
        {parts.map((part, index) => {
          if (index === parts.length - 1) return <span key={index}>{part}</span>;
          return (
            <span key={index}>
              {part}
              「<Link href={`/contests/${metadata.contestId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                {title}
              </Link>」
            </span>
          );
        })}
      </p>
    );
  }

  if (metadata?.diaryId && metadata.diaryTitle) {
    const title = metadata.diaryTitle;
    const parts = content.split(`「${title}」`);

    if (parts.length < 2) return <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">{content}</p>;

    return (
      <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
         {parts.map((part, index) => {
          if (index === parts.length - 1) return <span key={index}>{part}</span>;
          return (
            <span key={index}>
              {part}
              「<Link href={`/diary/${metadata.diaryId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                {title}
              </Link>」
            </span>
          );
        })}
      </p>
    );
  }

  if (content.includes('ここからチェック') && (metadata?.postId || metadata?.diaryId)) {
    const parts = content.split('ここからチェック');
    const linkHref = metadata.postId ? `/p/${metadata.postId}` : `/diary/${metadata.diaryId}`;

    return (
      <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
        {parts.map((part, index) => {
          if (index === parts.length - 1) return <span key={index}>{part}</span>;
          return (
            <span key={index}>
              {part}
              <Link href={linkHref} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                ここからチェック
              </Link>
            </span>
          );
        })}
      </p>
    );
  }

  return (
    <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
      {notification.content}
    </p>
  );
}
