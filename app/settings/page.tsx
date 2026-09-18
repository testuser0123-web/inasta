import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      activityCalendarVisibility: true,
      activityCalendarPalette: true,
      excludeUnverifiedPosts: true,
      showMobileQuickNav: true,
    },
  });

  if (!user) {
      redirect('/login');
  }

  return (
    <SettingsClient
      initialActivityCalendarPalette={user.activityCalendarPalette}
      initialActivityCalendarVisibility={user.activityCalendarVisibility}
      initialExcludeUnverifiedPosts={user.excludeUnverifiedPosts}
      initialShowMobileQuickNav={user.showMobileQuickNav}
    />
  );
}
