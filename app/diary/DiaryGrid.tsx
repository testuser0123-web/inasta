'use client';

import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';

export interface DiaryUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isGold: boolean;
}

export interface DiaryEntry {
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

export function DiaryGrid({ diaries }: { diaries: DiaryEntry[] }) {
  if (diaries.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-xl">日記がありません。</p>
      </div>
    );
  }

  return (
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
                <span className="text-gray-400">サムネイルなし</span>
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
  );
}
