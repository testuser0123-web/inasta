import type { ActivityPalette } from './activity-palette';

export type ActivityVisibility = 'HIDDEN' | 'SELF' | 'PUBLIC';
export type ActivityDay = { date: string; accessed: boolean; posted: boolean };
export type ActivityMonth = {
  palette: ActivityPalette;
  month: string;
  today: string;
  trackingStartedAt: string;
  joinedAt: string;
  days: ActivityDay[];
};

export function jstDate(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function monthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < '2000-01' || month > '9998-12') {
    throw new Error('Invalid month');
  }
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

export function shiftMonth(month: string, offset: number) {
  const { start } = monthBounds(month);
  start.setUTCMonth(start.getUTCMonth() + offset);
  return start.toISOString().slice(0, 7);
}

export function dayStatus(date: string, activity: ActivityDay | undefined, data: ActivityMonth) {
  if (date > data.today) return '未来の日付';
  if (date < data.joinedAt) return '登録前';
  if (activity?.posted) return '投稿あり';
  if (activity?.accessed) return 'アクセスあり';
  if (date < data.trackingStartedAt) return 'アクセス記録なし';
  return 'アクセスなし';
}
