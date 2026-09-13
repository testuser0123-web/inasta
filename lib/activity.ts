import type { Prisma } from '@prisma/client';
import { monthBounds, type ActivityMonth, jstDate } from './activity-calendar';

// Atomic, monotonic updates: simultaneous access must never erase a post flag.
export async function recordActivity(tx: Pick<Prisma.TransactionClient, '$executeRaw'>, userId: number, posted = false, now = new Date()) {
  const date = jstDate(now);
  await tx.$executeRaw`
    INSERT INTO "UserActivity" ("userId", "date", "accessed", "posted")
    VALUES (${userId}, ${date}::date, true, ${posted})
    ON CONFLICT ("userId", "date") DO UPDATE
    SET "accessed" = true, "posted" = "UserActivity"."posted" OR EXCLUDED."posted"
    WHERE NOT "UserActivity"."accessed" OR (EXCLUDED."posted" AND NOT "UserActivity"."posted")
  `;
  return date;
}

export async function readActivityMonth(client: Pick<Prisma.TransactionClient, '$queryRaw'>, userId: number, viewerId: number | undefined, month: string, now = new Date()): Promise<ActivityMonth | null> {
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error('Invalid user');
  const { start, end } = monthBounds(month);
  const today = jstDate(now);
  if (month > today.slice(0, 7)) throw new Error('Future month');
  // One statement checks current visibility and reads the month. Never cache per viewer.
  const rows = await client.$queryRaw<Array<{
    createdAt: Date; activityTrackingStartedAt: Date;
    date: Date | null; accessed: boolean | null; posted: boolean | null;
  }>>`
    SELECT u."createdAt", u."activityTrackingStartedAt", a."date", a."accessed", a."posted"
    FROM "User" u
    LEFT JOIN "UserActivity" a ON a."userId" = u.id AND a.date >= ${start} AND a.date < ${end}
    WHERE u.id = ${userId}
      AND (u."activityCalendarVisibility" = 'PUBLIC'
        OR (u."activityCalendarVisibility" = 'SELF' AND u.id = ${viewerId ?? -1}))
    ORDER BY a.date
  `;
  if (!rows.length) return null;
  return {
    month, today,
    joinedAt: jstDate(rows[0].createdAt),
    trackingStartedAt: jstDate(rows[0].activityTrackingStartedAt),
    days: rows.flatMap(row => row.date ? [{
      date: row.date.toISOString().slice(0, 10), accessed: !!row.accessed, posted: !!row.posted,
    }] : []),
  };
}
