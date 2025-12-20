'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, PenLine, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { getDiariesByDate, checkHasPostedToday } from '@/app/actions/diary';

type DiaryListProps = {
  dateParam: string;
  currentUserId: number;
};

interface DiaryUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isGold: boolean;
}

interface DiaryEntry {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  createdAt: Date;
  user: DiaryUser;
  _count: {
    likes: number;
    comments: number;
  };
}

export function DiaryList({ dateParam, currentUserId, diaries, hasPostedToday }: DiaryListProps & { diaries: DiaryEntry[], hasPostedToday: boolean }) {
  const router = useRouter();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    router.push(`/diary?date=${newDate}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-white dark:bg-black z-10 py-4 border-b dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={dateParam}
              onChange={handleDateChange}
              className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 w-48"
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
            <span className="hidden sm:inline">Write Diary</span>
          </Link>
        )}
      </div>

      {diaries.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-xl">No diaries found for this date.</p>
          {!hasPostedToday && dateParam === new Date().toISOString().split('T')[0] && (
            <p className="mt-2">Be the first to write one!</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {diaries.map((diary) => (
            <Link key={diary.id} href={`/diary/${diary.id}`}>
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200">
                {diary.thumbnailUrl ? (
                  <div className="aspect-video relative">
                    <img
                      src={diary.thumbnailUrl}
                      alt={diary.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-gray-400">No Thumbnail</span>
                  </div>
                )}

                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2 line-clamp-2">{diary.title}</h3>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                       {/* Avatar */}
                       <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                          {diary.user.avatarUrl ? (
                            <img src={diary.user.avatarUrl} alt={diary.user.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-xs">
                              {diary.user.username[0].toUpperCase()}
                            </div>
                          )}
                       </div>
                       <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                         {diary.user.username}
                       </span>
                    </div>

                    <div className="flex items-center gap-3 text-gray-500 text-sm">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{diary._count.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{diary._count.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
