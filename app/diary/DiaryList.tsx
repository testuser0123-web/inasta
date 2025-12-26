'use client';

import { PenLine } from 'lucide-react';
import Link from 'next/link';
import { DiaryGrid, DiaryEntry } from './DiaryGrid';
import { DiaryDateFilter } from './DiaryDateFilter';

type DiaryListProps = {
  dateParam: string;
  currentUserId: number;
  diaries: DiaryEntry[];
  postedDates: string[];
  hasPostedToday: boolean;
};

export function DiaryList({ dateParam, currentUserId, diaries, postedDates, hasPostedToday, isGuest }: DiaryListProps & { isGuest?: boolean }) {
  const currentDate = new Date().toISOString().split('T')[0];
  const isToday = dateParam === currentDate;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-8 sticky top-0 bg-indigo-50 dark:bg-gray-900 z-30 py-4 px-4 border-b dark:border-gray-800 -mx-4 sm:mx-0 sm:rounded-lg gap-4">
        <div className="flex items-center gap-4">
          <DiaryDateFilter selectedDate={dateParam} validDates={postedDates} />
        </div>

        {!hasPostedToday && isToday && !isGuest && (
          <Link
            href={`/diary/new?date=${dateParam}`}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
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
