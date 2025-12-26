'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import type { Session } from '@/lib/auth';

export default function LayoutShell({
    children,
    session
}: {
    children: React.ReactNode,
    session: Session | null
}) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    return (
        <div className="flex min-h-screen">
            {!isAuthPage && <Sidebar username={session?.username} />}
            <main className={`flex-1 ${!isAuthPage ? 'md:ml-64' : ''} w-full`}>
                {children}
            </main>
        </div>
    );
}
