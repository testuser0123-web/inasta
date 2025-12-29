'use client';

import Link from 'next/link';
import { Home, Search, PlusSquare, User, LogOut, Menu, Trophy, Book, LogIn, Bell, Inbox, ShieldAlert, Mail, UserCog } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/app/actions/logout';
import { useUI } from '@/components/providers/ui-provider';

export default function Sidebar({ username, unreadCount = 0, isAdmin = false, isRoleManager = false }: { username?: string, unreadCount?: number, isAdmin?: boolean, isRoleManager?: boolean }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isSidebarVisible } = useUI();

  // Guest nav items
  const guestNavItems = [
    { icon: Home, label: 'ホーム', href: '/' },
    { icon: Trophy, label: 'コンテスト', href: '/contests' },
    { icon: Book, label: '日記', href: '/diary' },
  ];

  // User nav items
  const baseUserNavItems = [
    { icon: Home, label: 'ホーム', href: '/' },
    { icon: Trophy, label: 'コンテスト', href: '/contests' },
    { icon: Book, label: '日記', href: '/diary' },
    { icon: Bell, label: '通知', href: '/notifications', badge: unreadCount > 0 ? unreadCount : null },
    { icon: Inbox, label: '投書箱', href: '/suggestions' },
    { icon: User, label: 'プロフィール', href: '/profile' },
  ];

  const userNavItems = [...baseUserNavItems];

  if (isAdmin) {
    userNavItems.push(
      { icon: ShieldAlert, label: '管理者通知', href: '/admin/notifications', badge: null },
      { icon: Mail, label: '管理者受信箱', href: '/admin/inbox', badge: null }
    );
  }

  if (isRoleManager) {
    userNavItems.push(
      { icon: UserCog, label: 'ロール管理', href: '/admin/roles', badge: null }
    );
  }

  const navItems = username ? userNavItems : guestNavItems;

  // Helper to safely access badge prop since it only exists on some items
  const getBadge = (item: any) => item.badge;

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
        className="md:hidden fixed bottom-6 left-6 z-[100] p-4 bg-brand text-white rounded-full shadow-lg hover:opacity-90 transition-colors"
      >
        <Menu className="w-6 h-6" />
        {unreadCount > 0 && (
           <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
             {unreadCount}
           </span>
        )}
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
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors relative ${
                  isActive
                    ? 'font-bold bg-gray-100 dark:bg-gray-900'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <div className="relative">
                    <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[3px]' : ''}`} />
                    {getBadge(item) && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                            {getBadge(item)}
                        </span>
                    )}
                </div>
                <span className="text-lg">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t dark:border-gray-800">
          {username ? (
            <form action={logout}>
              <button className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 w-full text-left text-red-500">
                <LogOut className="w-6 h-6" />
                <span className="text-lg">ログアウト</span>
              </button>
            </form>
          ) : (
            <Link href="/login" className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 w-full text-left text-brand">
                <LogIn className="w-6 h-6" />
                <span className="text-lg">ログイン</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
