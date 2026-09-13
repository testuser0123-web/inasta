-- Additive rollout for an existing database (this repository has no Prisma migration baseline).
-- Run once, before deploying the application. Reruns preserve the tracking start time.
BEGIN;
DO $$ BEGIN
  CREATE TYPE "ActivityCalendarVisibility" AS ENUM ('HIDDEN', 'SELF', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activityCalendarVisibility" "ActivityCalendarVisibility" NOT NULL DEFAULT 'HIDDEN';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activityTrackingStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE TABLE IF NOT EXISTS "UserActivity" (
  "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "accessed" BOOLEAN NOT NULL DEFAULT false,
  "posted" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("userId", "date")
);
-- Prisma timestamps are UTC without time zone. Convert explicitly, regardless of session timezone.
INSERT INTO "UserActivity" ("userId", "date", "accessed", "posted")
SELECT DISTINCT "userId", ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')::date, false, true
FROM "Post"
ON CONFLICT ("userId", "date") DO UPDATE SET "posted" = true;
-- Historical published diaries use their creation time. Older drafts have no
-- stored publication timestamp, so their historical day may be approximate.
INSERT INTO "UserActivity" ("userId", "date", "accessed", "posted")
SELECT DISTINCT "userId", ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')::date, false, true
FROM "Diary" WHERE "isDraft" = false
ON CONFLICT ("userId", "date") DO UPDATE SET "posted" = true;
COMMIT;
