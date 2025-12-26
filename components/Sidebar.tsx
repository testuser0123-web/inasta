'use client';

import Link from 'next/link';
import { Home, Search, PlusSquare, User, LogOut, Menu, Trophy, Book } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/app/actions/logout';
import { useUI } from '@/components/providers/ui-provider';

export default function Sidebar({ username }: { username?: string }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isSidebarVisible } = useUI();

  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Search', href: '/?feed=search' },
    { icon: Trophy, label: 'Contests', href: '/contests' },
    { icon: Book, label: 'Diary', href: '/diary' },
    { icon: PlusSquare, label: 'Create', href: '/upload' },
    { icon: User, label: 'Profile', href: '/profile' },
  ];

  // Hide mobile menu button and prevent interaction when sidebar is hidden (e.g. video editor)
  if (!isSidebarVisible) {
      // Return null to completely hide (including hamburger button)
      return null;
  }

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed bottom-6 left-6 z-[100] p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-black border-r dark:border-gray-800 transition-transform duration-300 ease-in-out z-[100]
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 w-64 flex flex-col`}
      >
        <div className="p-6 border-b dark:border-gray-800">
          <Link href="/" className="block">
            <div className="relative h-8 w-auto">
              <img
                src="/logo.png"
                alt="INASTA"
                className="h-full w-auto block dark:hidden"
              />
              <img
                src="/logo-inverted.png"
                alt="INASTA"
                className="hidden h-full w-auto dark:block"
              />
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  isActive
                    ? 'font-bold bg-gray-100 dark:bg-gray-900'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[3px]' : ''}`} />
                <span className="text-lg">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {username && (
          <div className="p-4 border-t dark:border-gray-800">
            <form action={logout}>
              <button className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 w-full text-left text-red-500">
                <LogOut className="w-6 h-6" />
                <span className="text-lg">Log out</span>
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}
