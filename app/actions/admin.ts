'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateSubscriptionSchema = z.object({
  username: z.string().min(1),
  amount: z.coerce.number().min(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

export async function updateUserSubscription(prevState: any, formData: FormData) {
  const session = await getSession();
  const adminUserId = process.env.ADMIN_USER_ID;

  if (!session || !adminUserId || String(session.id) !== adminUserId) {
    return { message: 'Unauthorized', success: false };
  }

  const validatedFields = updateSubscriptionSchema.safeParse({
    username: formData.get('username'),
    amount: formData.get('amount'),
    date: formData.get('date'),
  });

  if (!validatedFields.success) {
    return { message: 'Invalid input', success: false };
  }

  const { username, amount, date } = validatedFields.data;
  const subscriptionDate = new Date(date);

  // Calculate expiration: 1 month later
  const expiresAt = new Date(subscriptionDate);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  try {
    const user = await db.user.findUnique({ where: { username } });
    if (!user) {
        return { message: 'User not found', success: false };
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        subscriptionAmount: amount,
        subscriptionDate: subscriptionDate,
        subscriptionExpiresAt: expiresAt,
      },
    });

    revalidatePath(`/users/${user.username}`);
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return { message: 'Database error', success: false };
  }

  revalidatePath('/admin/subscription');
  revalidatePath('/contributors');

  return { message: 'Subscription updated successfully', success: true };
}
