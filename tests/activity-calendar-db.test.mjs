import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { recordActivity, readActivityMonth } from '../lib/activity.ts';

// In-memory PostgreSQL. No network connection or production credentials.
test('migration, backfill, atomic flags, visibility and month queries', async () => {
  const client = new PGlite();
  try {
    await client.query('BEGIN');
    await client.query('CREATE SCHEMA activity_calendar_test');
    await client.query('SET LOCAL search_path TO activity_calendar_test');
    await client.exec(`CREATE TABLE "User" (id INTEGER PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL);
      CREATE TABLE "Post" ("userId" INTEGER, "createdAt" TIMESTAMP(3));
      CREATE TABLE "Diary" ("userId" INTEGER, "createdAt" TIMESTAMP(3), "isDraft" BOOLEAN NOT NULL);
      INSERT INTO "User" VALUES (1, '2025-01-01'), (2, '2025-01-01');
      INSERT INTO "Post" VALUES (1, '2026-08-31 15:00:00'), (1, '2026-08-31 16:00:00');
      INSERT INTO "Diary" VALUES (1, '2026-09-04 15:00:00', false), (1, '2026-09-05 15:00:00', true);`);
    const migration = (await readFile(new URL('../scripts/activity-calendar.sql', import.meta.url), 'utf8')).replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '');
    await client.exec(migration);
    await client.exec(migration);
    const run = (strings, values) => client.query(strings.reduce((q, s, i) => q + (i ? '$' + i : '') + s, ''), values);
    const adapter = {
      $executeRaw: async (strings, ...values) => (await run(strings, values)).affectedRows,
      $queryRaw: async (strings, ...values) => (await run(strings, values)).rows,
    };
    const now = new Date('2026-09-13T02:00:00Z');
    assert.equal(await readActivityMonth(adapter, 1, 1, '2026-09', now), null);
    await client.query(`UPDATE "User" SET "activityCalendarVisibility" = 'SELF' WHERE id = 1`);
    let data = await readActivityMonth(adapter, 1, 1, '2026-09', now);
    assert.equal(data.days.length, 2);
    assert.deepEqual(data.days[0], { date: '2026-09-01', accessed: false, posted: true });
    assert.deepEqual(data.days[1], { date: '2026-09-05', accessed: false, posted: true });
    assert.equal(await readActivityMonth(adapter, 1, 2, '2026-09', now), null);
    assert.equal(await readActivityMonth(adapter, 1, undefined, '2026-09', now), null);
    await recordActivity(adapter, 1, false, now);
    await recordActivity(adapter, 1, true, now);
    await recordActivity(adapter, 1, false, now);
    await recordActivity(adapter, 1, false, now);
    data = await readActivityMonth(adapter, 1, 1, '2026-09', now);
    assert.equal(data.days.length, 3);
    assert.deepEqual(data.days[2], { date: '2026-09-13', accessed: true, posted: true });
    await client.query(`DELETE FROM "Post"`);
    assert.equal((await readActivityMonth(adapter, 1, 1, '2026-09', now)).days[0].posted, true);
    await client.query(`DELETE FROM "Diary"`);
    assert.equal((await readActivityMonth(adapter, 1, 1, '2026-09', now)).days[1].posted, true);
    await client.query(`UPDATE "User" SET "activityCalendarVisibility" = 'PUBLIC' WHERE id = 1`);
    assert.equal((await readActivityMonth(adapter, 1, undefined, '2026-09', now)).days.length, 3);
    assert.equal((await readActivityMonth(adapter, 1, 2, '2026-08', now)).days.length, 0);
    await client.query(`UPDATE "User" SET "activityCalendarVisibility" = 'HIDDEN' WHERE id = 1`);
    assert.equal(await readActivityMonth(adapter, 1, undefined, '2026-09', now), null);
    await assert.rejects(readActivityMonth(adapter, 1, 1, '2026-10', now));
    await assert.rejects(readActivityMonth(adapter, -1, 1, '2026-09', now));
    await client.query('SAVEPOINT post_failure');
    await recordActivity(adapter, 2, true, now);
    await client.query('ROLLBACK TO SAVEPOINT post_failure');
    assert.equal((await client.query('SELECT * FROM "UserActivity" WHERE "userId" = 2')).rows.length, 0);
    await client.query('DELETE FROM "User" WHERE id = 1');
    assert.equal((await client.query('SELECT * FROM "UserActivity"')).rows.length, 0);
  } finally {
    await client.query('ROLLBACK');
    await client.close();
  }
});
