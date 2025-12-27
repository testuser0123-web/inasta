'use server';

import { db as prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';

export async function getNotifications() {
  const session = await getSession();
  if (!session || !session.id) {
    return [];
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return notifications;
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId?: number): Promise<number> {
  // If userId is provided, use it (server-side context where session might already be known)
  // Otherwise fetch session.
  let targetUserId = userId;
  if (!targetUserId) {
    const session = await getSession();
    if (!session || !session.id) {
      return 0;
    }
    targetUserId = session.id;
  }

  try {
    const count = await prisma.notification.count({
      where: {
        userId: targetUserId,
        isRead: false,
      },
    });
    return count;
  } catch (error) {
    console.error('Failed to count unread notifications:', error);
    return 0;
  }
}

export async function markAllNotificationsAsRead() {
  const session = await getSession();
  if (!session || !session.id) {
    return;
  }

  try {
    await prisma.notification.updateMany({
      where: {
        userId: session.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    revalidatePath('/notifications');
    revalidatePath('/', 'layout'); // Update sidebar count
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
  }
}

const developerNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
  type: z.enum(['DEVELOPER', 'SYSTEM']).default('DEVELOPER'),
});

export async function createDeveloperNotification(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const password = formData.get('password') as string;
  const type = (formData.get('type') as NotificationType) || 'DEVELOPER';
  const targetUsername = formData.get('targetUsername') as string;

  const validation = developerNotificationSchema.safeParse({ title, content, password, type });

  if (!validation.success) {
    return { success: false, error: validation.error.message };
  }

  if (password !== 'admin') {
     return { success: false, error: 'Invalid password' };
  }

  try {
    let users;

    if (targetUsername && targetUsername.trim() !== '') {
      const user = await prisma.user.findUnique({
        where: { username: targetUsername.trim() },
        select: { id: true },
      });

      if (!user) {
        return { success: false, error: `User "${targetUsername}" not found` };
      }
      users = [user];
    } else {
      users = await prisma.user.findMany({
        select: { id: true },
      });
    }

    if (users.length === 0) {
        return { success: true, message: 'No users to notify' };
    }

    const notifications = users.map((user) => ({
      userId: user.id,
      type: type,
      title: title,
      content: content || null,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    return { success: true, message: `Sent notification to ${users.length} users` };
  } catch (error) {
    console.error('Failed to create developer notification:', error);
    return { success: false, error: 'Failed to create notification' };
  }
}
