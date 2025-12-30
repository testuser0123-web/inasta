'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import OmikujiModal from '@/components/OmikujiModal';
import type { Session } from '@/lib/auth';

export default function LayoutShell({
    children,
    session,
    unreadCount = 0,
    isAdmin = false,
    isRoleManager = false
}: {
    children: React.ReactNode,
    session: Session | null,
    unreadCount?: number,
    isAdmin?: boolean,
    isRoleManager?: boolean
}) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    return (
        <div className="flex min-h-screen">
            <OmikujiModal />
            {!isAuthPage && <Sidebar username={session?.username} unreadCount={unreadCount} isAdmin={isAdmin} isRoleManager={isRoleManager} />}
            <main className={`flex-1 ${!isAuthPage ? 'md:ml-64' : ''} w-full`}>
                {children}
            </main>
        </div>
    );
}
