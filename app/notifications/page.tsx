'use client';

import { useEffect, useState } from 'react';
import { getNotifications, markAllNotificationsAsRead } from '@/app/actions/notification';
import { NotificationType } from '@prisma/client';
import { Bell, Info } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

type NotificationMetadata = {
  contestId?: number;
  contestTitle?: string;
  diaryId?: number;
  diaryTitle?: string;
} | null;

type Notification = {
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
function RenderNotificationContent({ notification }: { notification: Notification }) {
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

  return (
    <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
      {notification.content}
    </p>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndMark() {
      try {
        const data = await getNotifications();
        // Cast metadata explicitly as it comes from JSON
        setNotifications(data as unknown as Notification[]);
        // Mark as read immediately when page is opened
        await markAllNotificationsAsRead();
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAndMark();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No notifications yet.</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border flex gap-4 transition-colors ${
                notification.type === 'DEVELOPER'
                  ? 'bg-primary/5 dark:bg-primary/20 border-primary/20 dark:border-primary/50'
                  : 'bg-white dark:bg-black border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="shrink-0 pt-1">
                {notification.type === 'DEVELOPER' ? (
                  <Info className="w-5 h-5 text-primary" />
                ) : (
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className={`font-semibold text-lg ${
                     notification.type === 'DEVELOPER'
                     ? 'text-primary'
                     : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {notification.title}
                  </h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">
                    {format(new Date(notification.createdAt), 'yyyy/MM/dd HH:mm')}
                  </span>
                </div>

                <RenderNotificationContent notification={notification} />

                <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                         notification.type === 'DEVELOPER'
                         ? 'border-primary/20 bg-primary/10 text-primary'
                         : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                        {notification.type === 'DEVELOPER' ? '開発者' : 'システム'}
                    </span>
                    {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-red-500" title="Unread"></span>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
