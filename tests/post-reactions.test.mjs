import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const postActions = readFileSync(new URL('../app/actions/post.ts', import.meta.url), 'utf8');
const feed = readFileSync(new URL('../components/Feed.tsx', import.meta.url), 'utf8');
const singlePost = readFileSync(new URL('../components/SinglePost.tsx', import.meta.url), 'utf8');
const postPage = readFileSync(new URL('../app/p/[id]/page.tsx', import.meta.url), 'utf8');

assert.match(schema, /model PostReaction\s*{[\s\S]*reactionKey\s+String[\s\S]*@@unique\(\[userId, postId, reactionKey\]\)/, 'PostReaction should use a scalable reactionKey unique per user/post/reaction');
assert.match(schema, /@@index\(\[postId, reactionKey\]\)/, 'PostReaction should index postId + reactionKey for grouped counts');
assert.match(postActions, /export async function toggleReaction\(postId: number, reactionKey: string\)/, 'post actions should expose toggleReaction');
assert.match(postActions, /buildPostReactionSummaries/, 'post fetchers should include reaction summaries');
assert.match(feed, /ALL_EMOJI_PICKER_URL/, 'Feed should expose a route to add any emoji, not just a fixed set');
assert.match(feed, /handleReaction/, 'Feed should support toggling reactions optimistically');
assert.match(singlePost, /handleReaction/, 'SinglePost should support toggling reactions optimistically');
assert.match(postPage, /reactions:\s*{[\s\S]*reactionKey:\s*true[\s\S]*userId:\s*true/, 'single post query should load reactions');
