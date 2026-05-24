export type PostReactionSummary = {
  reactionKey: string;
  emoji: string;
  count: number;
  hasReacted: boolean;
};

type RawPostReaction = {
  reactionKey: string;
  userId: number;
};

const UNICODE_REACTION_PREFIX = "unicode:";
const MAX_REACTION_KEY_LENGTH = 80;

export function normalizeReactionKey(input: string): string {
  const value = input.trim();
  if (!value) {
    throw new Error("Reaction is required");
  }

  const reactionKey = value.startsWith(UNICODE_REACTION_PREFIX)
    ? value
    : `${UNICODE_REACTION_PREFIX}${value}`;

  const emoji = reactionKey.slice(UNICODE_REACTION_PREFIX.length).trim();
  if (!emoji) {
    throw new Error("Reaction emoji is required");
  }

  if (reactionKey.length > MAX_REACTION_KEY_LENGTH) {
    throw new Error("Reaction is too long");
  }

  return reactionKey;
}

export function reactionKeyToEmoji(reactionKey: string): string {
  if (reactionKey.startsWith(UNICODE_REACTION_PREFIX)) {
    return reactionKey.slice(UNICODE_REACTION_PREFIX.length);
  }
  return reactionKey;
}

export function buildPostReactionSummaries(
  reactions: RawPostReaction[],
  currentUserId: number
): PostReactionSummary[] {
  const summaries = new Map<string, PostReactionSummary>();

  for (const reaction of reactions) {
    const existing = summaries.get(reaction.reactionKey);
    if (existing) {
      existing.count += 1;
      existing.hasReacted ||= reaction.userId === currentUserId;
    } else {
      summaries.set(reaction.reactionKey, {
        reactionKey: reaction.reactionKey,
        emoji: reactionKeyToEmoji(reaction.reactionKey),
        count: 1,
        hasReacted: reaction.userId === currentUserId,
      });
    }
  }

  return [...summaries.values()].sort((a, b) => b.count - a.count || a.reactionKey.localeCompare(b.reactionKey));
}
