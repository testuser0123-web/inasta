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
      excludeUnverifiedPosts: true,
      showMobileQuickNav: true,
      themeColor: true,
    },
  });

  if (!user) {
      redirect('/login');
  }

  return (
    <SettingsClient
      initialExcludeUnverifiedPosts={user.excludeUnverifiedPosts}
      initialShowMobileQuickNav={user.showMobileQuickNav}
      initialThemeColor={user.themeColor || '#4f46e5'}
    />
  );
}
