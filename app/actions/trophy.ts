'use server';

import { db } from '@/lib/db';

export type UserTrophies = {
    gold: number;
    silver: number;
    bronze: number;
};

export async function getUserTrophies(userId: number): Promise<UserTrophies> {
  const trophies = await db.$queryRaw<{ count: bigint, rank: bigint }[]>`
    WITH ContestResults AS (
      SELECT
        cp."contestId",
        cp."userId",
        RANK() OVER (PARTITION BY cp."contestId" ORDER BY COUNT(cl.id) DESC, cp."createdAt" ASC) as rank
      FROM "ContestPost" cp
      LEFT JOIN "ContestLike" cl ON cp.id = cl."contestPostId"
      JOIN "Contest" c ON cp."contestId" = c.id
      WHERE c."endDate" < NOW()
      GROUP BY cp."contestId", cp."userId", cp.id, cp."createdAt"
    )
    SELECT
      rank,
      COUNT(*) as count
    FROM ContestResults
    WHERE "userId" = ${userId} AND rank <= 3
    GROUP BY rank
  `;

  const result = { gold: 0, silver: 0, bronze: 0 };
  trophies.forEach((t: any) => {
      const r = Number(t.rank);
      const c = Number(t.count);
      if (r === 1) result.gold += c;
      if (r === 2) result.silver += c;
      if (r === 3) result.bronze += c;
  });

  return result;
}
