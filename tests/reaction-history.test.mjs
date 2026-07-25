import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const feed = readFileSync(new URL('../components/Feed.tsx', import.meta.url), 'utf8');
const singlePost = readFileSync(new URL('../components/SinglePost.tsx', import.meta.url), 'utf8');
const reactionHistoryLib = readFileSync(new URL('../lib/reaction-history.ts', import.meta.url), 'utf8');

console.log('Running reaction history checks...');

// 1. Verify reaction history lib implementation
assert.match(reactionHistoryLib, /export function getReactionHistory/, 'getReactionHistory should be exported');
assert.match(reactionHistoryLib, /export function saveReactionToHistory/, 'saveReactionToHistory should be exported');
assert.match(reactionHistoryLib, /reaction_history_v1/, 'Should store history in localStorage');
assert.match(reactionHistoryLib, /MAX_HISTORY_ITEMS\s*=\s*20/, 'Should have a maximum history of 20 items');

// 2. Verify integration in Feed.tsx
assert.match(feed, /import.*getReactionHistory.*saveReactionToHistory/, 'Feed.tsx should import history functions');
assert.match(feed, /reactionHistory.*setReactionHistory/, 'Feed.tsx should maintain reactionHistory state');
assert.match(feed, /setReactionHistory\(getReactionHistory\(\)\)/, 'Feed.tsx should initialize history in useEffect');
assert.match(feed, /saveReactionToHistory\(reactionKey, emojiStr, customEmoji\)/, 'Feed.tsx should save to history on adding a reaction');
assert.match(feed, /reactionHistory\.length\s*>\s*0/, 'Feed.tsx should conditionally render the history section only when not empty');
assert.match(feed, />履歴</, 'Feed.tsx should display "履歴" as the section label');

// 3. Verify integration in SinglePost.tsx
assert.match(singlePost, /import.*getReactionHistory.*saveReactionToHistory/, 'SinglePost.tsx should import history functions');
assert.match(singlePost, /reactionHistory.*setReactionHistory/, 'SinglePost.tsx should maintain reactionHistory state');
assert.match(singlePost, /setReactionHistory\(getReactionHistory\(\)\)/, 'SinglePost.tsx should initialize history in useEffect');
assert.match(singlePost, /saveReactionToHistory\(reactionKey, emojiStr, customEmoji\)/, 'SinglePost.tsx should save to history on adding a reaction');
assert.match(singlePost, /reactionHistory\.length\s*>\s*0/, 'SinglePost.tsx should conditionally render the history section only when not empty');
assert.match(singlePost, />履歴</, 'SinglePost.tsx should display "履歴" as the section label');

console.log('All reaction history checks passed successfully!');
