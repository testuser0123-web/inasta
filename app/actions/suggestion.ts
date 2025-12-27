'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';

const suggestionSchema = z.object({
  content: z.string().min(1, '要望を入力してください').max(1000, '要望は1000文字以内で入力してください'),
});

type State = {
  error?: string;
  success?: boolean;
};

export async function createSuggestion(prevState: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const result = suggestionSchema.safeParse({
    content: formData.get('content'),
  });

  if (!result.success) {
    return {
      error: result.error.issues[0].message,
    };
  }

  try {
    const { content } = result.data;

    // Create the suggestion
    await db.suggestion.create({
      data: {
        content,
        userId: session.id,
      },
    });

    // Send notification to admin if ADMIN_USER_ID is set
    const adminId = process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID, 10) : null;

    if (adminId && !isNaN(adminId)) {
        // Find the user to ensure they exist before sending notification (optional safety check)
        const adminUser = await db.user.findUnique({
            where: { id: adminId }
        });

        if (adminUser) {
            await db.notification.create({
                data: {
                    userId: adminId,
                    type: NotificationType.SYSTEM, // Using SYSTEM as requested
                    title: '新しい投書が届きました',
                    content: `ユーザー「${session.username}」から新しい投書があります。`,
                }
            });
        }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to create suggestion:', error);
    return { error: '送信に失敗しました。後でもう一度お試しください。' };
  }
}
