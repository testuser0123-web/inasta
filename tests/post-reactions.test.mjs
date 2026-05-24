import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const postActions = readFileSync(new URL('../app/actions/post.ts', import.meta.url), 'utf8');
const feed = readFileSync(new URL('../components/Feed.tsx', import.meta.url), 'utf8');
const singlePost = readFileSync(new URL('../components/SinglePost.tsx', import.meta.url), 'utf8');
const postPage = readFileSync(new URL('../app/p/[id]/page.tsx', import.meta.url), 'utf8');
const reactionsLib = readFileSync(new URL('../lib/reactions.ts', import.meta.url), 'utf8');

assert.match(schema, /model PostReaction\s*{[\s\S]*reactionKey\s+String[\s\S]*@@unique\(\[userId, postId, reactionKey\]\)/, 'PostReaction should use a scalable reactionKey unique per user/post/reaction');
assert.match(schema, /@@index\(\[postId, reactionKey\]\)/, 'PostReaction should index postId + reactionKey for grouped counts');
assert.match(postActions, /export async function toggleReaction\(postId: number, reactionKey: string\)/, 'post actions should expose toggleReaction');
assert.match(postActions, /buildPostReactionSummaries/, 'post fetchers should include reaction summaries');
assert.match(reactionsLib, /export const EMOJI_REACTION_OPTIONS/, 'Reaction picker should use a curated emoji list instead of a text prompt');
assert.match(reactionsLib, /export function isValidSingleUnicodeEmoji/, 'Reaction normalization should reject arbitrary strings and multi-emoji values');
assert.doesNotMatch(feed, /window\.prompt/, 'Feed should not accept arbitrary reaction strings through prompt input');
assert.doesNotMatch(singlePost, /window\.prompt/, 'SinglePost should not accept arbitrary reaction strings through prompt input');
assert.match(feed, /showReactionPickerForPostId/, 'Feed should open an emoji list from the plus button');
assert.match(singlePost, /showReactionPicker/, 'SinglePost should open an emoji list from the plus button');
assert.doesNotMatch(feed, /QUICK_REACTIONS\.filter/, 'Feed should not render default reaction buttons before the plus button is opened');
assert.doesNotMatch(singlePost, /QUICK_REACTIONS\.filter/, 'SinglePost should not render default reaction buttons before the plus button is opened');
assert.match(feed, /selectedPost\.comment[\s\S]*selectedPost\.hashtags[\s\S]*selectedPost\.createdAt[\s\S]*data-emoji-picker/, 'Feed modal metadata order should be comment, hashtags, time, reactions');
assert.match(singlePost, /post\.comment[\s\S]*post\.hashtags[\s\S]*post\.createdAt[\s\S]*data-emoji-picker/, 'SinglePost metadata order should be comment, hashtags, time, reactions');
assert.match(feed, /handleReaction/, 'Feed should support toggling reactions optimistically');
assert.match(singlePost, /handleReaction/, 'SinglePost should support toggling reactions optimistically');
assert.match(postPage, /reactions:\s*{[\s\S]*reactionKey:\s*true[\s\S]*userId:\s*true/, 'single post query should load reactions');
