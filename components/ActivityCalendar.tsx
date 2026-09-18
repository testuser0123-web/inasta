'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getActivityMonth } from '@/app/actions/activity';
import { dayStatus, jstDate, monthBounds, shiftMonth, type ActivityMonth } from '@/lib/activity-calendar';
import { activityPalettes, type ActivityPalette } from '@/lib/activity-palette';

// Keep calendar cells and legend colors in sync, including dark mode.
function ActivityMarker({ status, palette }: { status: ReturnType<typeof dayStatus>; palette: ActivityPalette }) {
  const appearance = status === '投稿あり'
    ? activityPalettes[palette].post
    : status === 'アクセスあり'
      ? activityPalettes[palette].access
      : status === '未来の日付' || status === '登録前'
        ? 'border border-gray-400 dark:border-gray-500'
        : 'bg-gray-100 dark:bg-gray-800';
  return <span aria-hidden="true" className={`block w-4 h-4 shrink-0 rounded-full ${appearance}`} />;
}

export default function ActivityCalendar({ userId }: { userId: number }) {
  const [month, setMonth] = useState(() => jstDate().slice(0, 7));
  const [result, setResult] = useState<{ userId: number; data: ActivityMonth | null } | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let request = 0;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      const current = ++request;
      getActivityMonth(userId, month).then(data => {
        if (active && current === request) {
          setResult({ userId, data });
          setError(false);
        }
      }).catch(() => {
        if (active && current === request) {
          setResult(null);
          setError(true);
        }
      });
    };
    refresh();
    window.addEventListener('activity-recorded', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.removeEventListener('activity-recorded', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId, month, revision]);

  if (error) return <p className="text-sm text-center py-3 text-gray-500" role="status">活動カレンダーを読み込めませんでした。<button className="underline ml-2" onClick={() => { setError(false); setRevision(n => n + 1); }}>再試行</button></p>;
  if (!result || result.userId !== userId || !result.data) return null;
  const data = result.data;
  return <ActivityCalendarView key={data.month} data={data} loading={data.month !== month} onMonthChange={setMonth} />;
}

export function ActivityCalendarView({ data, loading = false, onMonthChange }: {
  data: ActivityMonth; loading?: boolean; onMonthChange: (month: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const { start, end } = monthBounds(data.month);
  const count = Math.round((end.getTime() - start.getTime()) / 86400000);
  const days = new Map(data.days.map(day => [day.date, day]));
  const currentMonth = data.today.slice(0, 7);
  const firstMonth = data.joinedAt.slice(0, 7);
  return (
    <section aria-label="活動カレンダー" aria-busy={loading} className="max-w-sm mx-auto my-6 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">活動カレンダー</h2>
        <button className="text-xs underline disabled:opacity-40" disabled={loading || data.month === currentMonth} onClick={() => onMonthChange(currentMonth)}>今月に戻る</button>
      </div>
      <div className="flex items-center justify-between mb-3">
        <button aria-label="前の月" disabled={loading || data.month <= firstMonth || data.month <= '2000-01'} onClick={() => onMonthChange(shiftMonth(data.month, -1))} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"><ChevronLeft size={18} /></button>
        <p aria-live="polite" className="text-sm font-medium">{Number(data.month.slice(0, 4))}年{Number(data.month.slice(5))}月{loading ? '・読込中' : ''}</p>
        <button aria-label="次の月" disabled={loading || data.month >= currentMonth} onClick={() => onMonthChange(shiftMonth(data.month, 1))} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 text-center gap-y-1">
        {['日', '月', '火', '水', '木', '金', '土'].map(day => <span key={day} className="text-xs text-gray-500 mb-1">{day}</span>)}
        {Array.from({ length: start.getUTCDay() }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const date = `${data.month}-${String(i + 1).padStart(2, '0')}`;
          const status = dayStatus(date, days.get(date), data);
          const label = `${Number(data.month.slice(5))}月${i + 1}日・${status}`;
          return <button key={date} type="button" title={label} aria-label={label} aria-pressed={selected === label} aria-current={date === data.today ? 'date' : undefined} onClick={() => setSelected(label)} className="h-10 flex items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-gray-100">
            <span className={`rounded-full p-0.5 ${selected === label ? 'ring-2 ring-gray-900 dark:ring-gray-100' : ''}`}><ActivityMarker status={status} palette={data.palette} /></span>
          </button>;
        })}
      </div>
      <p aria-live="polite" className="text-xs text-center text-gray-600 dark:text-gray-300 min-h-5 mt-2">{selected || '日付を選ぶと活動を確認できます'}</p>
      <div className="flex justify-center gap-4 text-xs mt-3 text-gray-600 dark:text-gray-300">
        <span className="flex items-center gap-1.5"><ActivityMarker status="アクセスあり" palette={data.palette} />アクセス</span>
        <span className="flex items-center gap-1.5"><ActivityMarker status="投稿あり" palette={data.palette} />投稿</span>
      </div>
      <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">アクセス記録は{data.trackingStartedAt.replaceAll('-', '/')}から記録。それ以前は不明。通常の投稿および日記が対象です。</p>
    </section>
  );
}
