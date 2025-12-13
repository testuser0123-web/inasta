'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Trophy, Menu, X } from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-4 z-[60] p-2 bg-white dark:bg-black rounded-full shadow-md md:hidden"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white dark:bg-black border-r dark:border-gray-800 z-50 transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:block md:w-20 lg:w-64 md:h-screen md:shrink-0 overflow-y-auto
      `}>
        <div className="p-6 md:p-4 lg:p-6 flex flex-col h-full">
            <div className="mb-8 hidden md:block">
               <h1 className="text-xl font-bold italic tracking-tighter md:hidden lg:block dark:text-white">INASTA</h1>
               <h1 className="text-xl font-bold italic tracking-tighter hidden md:block lg:hidden dark:text-white">I</h1>
            </div>

            {/* Spacer for mobile menu button */}
            <div className="h-10 md:hidden" />

            <nav className="space-y-2 flex-1">
                <Link
                    href="/"
                    className="flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                >
                    <Home className="w-6 h-6 shrink-0" />
                    <span className="font-semibold text-lg md:hidden lg:block">Home</span>
                </Link>
                <Link
                    href="/contests"
                    className="flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                >
                    <Trophy className="w-6 h-6 shrink-0" />
                    <span className="font-semibold text-lg md:hidden lg:block">Contests</span>
                </Link>
            </nav>

            <div className="text-xs text-gray-400 mt-auto pt-4 border-t dark:border-gray-800 md:hidden lg:block">
                © 2025 INASTA
            </div>
        </div>
      </div>
    </>
  );
}
