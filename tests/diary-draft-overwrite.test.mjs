import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

console.log('Running diary draft overwrite and delete structure checks...');

const source = readFileSync(new URL('../app/actions/diary.ts', import.meta.url), 'utf8');

// 1. Verify loadDraftToDate does not update/delete the past draft itself but copies its contents
assert.match(
  source,
  /Update the existing draft with the contents of the past draft/,
  'loadDraftToDate should update the existing draft on the target date'
);

assert.match(
  source,
  /Create a new draft on the target date with the contents of the past draft/,
  'loadDraftToDate should create a new draft if none exists on the target date'
);

assert.match(
  source,
  /title:\s*draft\.title,\s*content:\s*draft\.content as any,\s*thumbnailUrl:\s*draft\.thumbnailUrl/,
  'loadDraftToDate should copy title, content, and thumbnailUrl from the past draft'
);

// 2. Verify createDiary reads fromDraftId and deletes the original past draft if present
assert.match(
  source,
  /const\s+fromDraftIdStr\s*=\s*formData\.get\('fromDraftId'\)\s+as\s+string\s*\|\s*null;/,
  'createDiary should parse fromDraftIdStr from formData'
);

assert.match(
  source,
  /const\s+fromDraftId\s*=\s*fromDraftIdStr\s*\?\s*parseInt\(fromDraftIdStr,\s*10\)\s*:\s*null;/,
  'createDiary should convert fromDraftIdStr to integer'
);

assert.match(
  source,
  /Delete the original past draft if this diary was posted from a loaded past draft/,
  'createDiary should have comment about deleting original past draft'
);

assert.match(
  source,
  /if\s*\(fromDraftId\)\s*\{/,
  'createDiary should check if fromDraftId is present'
);

assert.match(
  source,
  /const\s+draftToDelete\s*=\s*await\s+db\.diary\.findUnique\(\{/,
  'createDiary should find the past draft to delete'
);

assert.match(
  source,
  /if\s*\(draftToDelete\s*&&\s*draftToDelete\.userId\s*===\s*session\.id\s*&&\s*draftToDelete\.isDraft\)\s*\{/,
  'createDiary should verify user matches and target is draft before deleting'
);

assert.match(
  source,
  /await\s+db\.diary\.delete\(\{/,
  'createDiary should execute db.diary.delete'
);

console.log('All diary draft overwrite and delete structure checks passed successfully!');
