'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { recordActivity, readActivityMonth } from '@/lib/activity';

export async function recordAccess() {
  const session = await getSession();
  if (!session) return null;
  return recordActivity(db, session.id);
}

export async function getActivityMonth(userId: number, month: string) {
  const session = await getSession();
  return readActivityMonth(db, userId, session?.id, month);
}
