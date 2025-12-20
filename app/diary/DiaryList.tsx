'use client';

import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, PenLine } from 'lucide-react';
import Link from 'next/link';
import { DiaryGrid, DiaryEntry } from './DiaryGrid';

type DiaryListProps = {
  dateParam: string;
  currentUserId: number;
  diaries: DiaryEntry[];
  hasPostedToday: boolean;
};

export function DiaryList({ dateParam, currentUserId, diaries, hasPostedToday }: DiaryListProps) {
  const router = useRouter();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    router.push(`/diary?date=${newDate}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-indigo-50 dark:bg-gray-900 z-10 py-4 px-4 border-b dark:border-gray-800 -mx-4 sm:mx-0 sm:rounded-lg">
        <div className="flex items-center gap-4">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={dateParam}
              onChange={handleDateChange}
              className="pl-10 pr-4 py-2 bg-white dark:bg-black rounded-lg border dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 w-48"
            />
          </div>
          <span className="text-lg font-medium hidden sm:block">
            {format(parseISO(dateParam), 'MMMM d, yyyy')}
          </span>
        </div>

        {!hasPostedToday && dateParam === new Date().toISOString().split('T')[0] && (
          <Link
            href={`/diary/new?date=${dateParam}`}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PenLine className="w-5 h-5" />
            <span className="hidden sm:inline">日記を書く</span>
          </Link>
        )}
      </div>

      <DiaryGrid diaries={diaries} />
    </div>
  );
}
