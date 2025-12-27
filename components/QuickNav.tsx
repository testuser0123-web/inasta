
'use client';

import Link from 'next/link';
import { Home, Trophy, Book } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function QuickNav() {
  const pathname = usePathname();

  // Simple active check. Since this is on the home page, the "Home" link will be active unless we are somewhere else (which we shouldn't be if this is only on home page)
  // However, this component might be used or the links point to other pages.
  // The links are: /, /contests, /diary

  // Design A: Segmented Control (Pill shape)
  // We want to hide this on desktop (md:hidden) as per requirements, but we'll handle responsive visibility in the parent or here.
  // The user requirement says "Home screen only" and "Mobile only".

  return (
    <div className="md:hidden px-4 pb-2">
      <div className="bg-gray-100 dark:bg-gray-900 rounded-full p-1 flex items-center shadow-inner">
        <Link
          href="/"
          className={`flex-1 flex items-center justify-center py-1.5 rounded-full text-sm font-semibold transition-all ${
            pathname === '/'
              ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Home className="w-4 h-4 mr-1.5" />
          ホーム
        </Link>
        <Link
          href="/contests"
          className={`flex-1 flex items-center justify-center py-1.5 rounded-full text-sm font-semibold transition-all ${
             pathname.startsWith('/contests')
              ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Trophy className="w-4 h-4 mr-1.5" />
          コンテスト
        </Link>
        <Link
          href="/diary"
          className={`flex-1 flex items-center justify-center py-1.5 rounded-full text-sm font-semibold transition-all ${
            pathname.startsWith('/diary')
              ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Book className="w-4 h-4 mr-1.5" />
          日記
        </Link>
      </div>
    </div>
  );
}
