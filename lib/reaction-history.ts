'use client';

import type { CustomEmojiSummary } from '@/lib/reactions';

export type ReactionHistoryItem = {
  reactionKey: string;
  emoji: string;
  customEmoji?: CustomEmojiSummary;
};

const STORAGE_KEY = 'reaction_history_v1';
const MAX_HISTORY_ITEMS = 20;

export function getReactionHistory(): ReactionHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_HISTORY_ITEMS);
    }
  } catch (error) {
    console.error('Failed to parse reaction history from localStorage', error);
  }
  return [];
}

export function saveReactionToHistory(reactionKey: string, emoji: string, customEmoji?: CustomEmojiSummary): ReactionHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const history = getReactionHistory();
    // Filter out existing occurrence
    const filtered = history.filter((item) => item.reactionKey !== reactionKey);
    // Unshift the new item to the beginning
    const newItem: ReactionHistoryItem = { reactionKey, emoji };
    if (customEmoji) {
      newItem.customEmoji = customEmoji;
    }
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to save reaction history to localStorage', error);
  }
  return getReactionHistory();
}
