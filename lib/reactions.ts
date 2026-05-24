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
const EMOJI_PATTERN = /(?:[\u00A9\u00AE\u203C\u2049\u2122\u2139\u2194-\u21AA\u231A-\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA-\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u27BF\u2934-\u2935\u2B05-\u2B55\u3030\u303D\u3297\u3299]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/;

export const EMOJI_REACTION_OPTIONS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃",
  "😉", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "😏", "😢", "😭", "😤",
  "😡", "🤯", "😳", "🥺", "😱", "🤔", "🫡", "🤫", "🤗", "😴", "🤤", "🤮",
  "👍", "👎", "👏", "🙌", "🫶", "🙏", "🤝", "💪", "👀", "💯", "❤️", "🧡",
  "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💕", "💖", "✨", "⭐", "🌟",
  "🔥", "🎉", "🎊", "🏆", "🥇", "🚀", "💎", "⚡", "🌈", "☀️", "🌙", "🍀",
  "🍎", "🍔", "🍕", "🍣", "🍰", "☕", "🍺", "🎮", "🎧", "📸", "💻", "✅",
  "❌", "⚠️", "❗", "❓", "🇯🇵", "🏳️‍🌈"
] as const;

type GraphemeSegment = { segment: string };
type GraphemeSegmenter = {
  segment(value: string): Iterable<GraphemeSegment>;
};
type IntlWithSegmenter = typeof Intl & {
  Segmenter?: new (locale?: string, options?: { granularity: "grapheme" }) => GraphemeSegmenter;
};

function getGraphemeSegments(value: string): string[] {
  const Segmenter = (Intl as IntlWithSegmenter).Segmenter;
  if (Segmenter) {
    const segmenter = new Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (segment) => segment.segment);
  }

  return Array.from(value);
}

export function isValidSingleUnicodeEmoji(value: string): boolean {
  const emoji = value.trim();
  if (!emoji || emoji.length > MAX_REACTION_KEY_LENGTH) return false;

  const segments = getGraphemeSegments(emoji);
  if (segments.length !== 1 || segments[0] !== emoji) return false;

  return EMOJI_PATTERN.test(emoji);
}

export function normalizeReactionKey(input: string): string {
  const value = input.trim();
  if (!value) {
    throw new Error("Reaction is required");
  }

  const emoji = value.startsWith(UNICODE_REACTION_PREFIX)
    ? value.slice(UNICODE_REACTION_PREFIX.length).trim()
    : value;

  if (!isValidSingleUnicodeEmoji(emoji)) {
    throw new Error("Reaction must be a single Unicode emoji");
  }

  return `${UNICODE_REACTION_PREFIX}${emoji}`;
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

  return Array.from(summaries.values()).sort((a, b) => b.count - a.count || a.reactionKey.localeCompare(b.reactionKey));
}
