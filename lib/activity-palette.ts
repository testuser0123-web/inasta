export const activityPalettes = {
  VIVID: { label: 'くっきり', access: 'bg-[#0072B2] dark:bg-[#56B4E9]', post: 'bg-[#D55E00] dark:bg-[#E69F00]' },
  GRADIENT: { label: 'グラデーション', access: 'bg-green-200 dark:bg-green-300', post: 'bg-green-700 dark:bg-green-600' },
} as const;

export type ActivityPalette = keyof typeof activityPalettes;

export function isActivityPalette(value: unknown): value is ActivityPalette {
  return value === 'VIVID' || value === 'GRADIENT';
}
