'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordAccess } from '@/app/actions/activity';
import { jstDate } from '@/lib/activity-calendar';

export default function ActivityTracker({ userId }: { userId: number }) {
  const pathname = usePathname();
  useEffect(() => {
    let disposed = false;
    let pending = false;
    let recorded = '';
    const check = async () => {
      if (document.visibilityState !== 'visible' || pending || recorded === jstDate()) return;
      pending = true;
      try {
        const date = await recordAccess();
        if (!disposed && date) {
          recorded = date;
          window.dispatchEvent(new Event('activity-recorded'));
        }
      } catch {
        // Retry on next visible tick; a failed activity write must not interrupt browsing.
      } finally { pending = false; }
    };
    void check();
    const timer = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [userId, pathname]);
  return null;
}
