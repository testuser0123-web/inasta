import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EditProfileClient from './EditProfileClient';

export default async function EditProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      username: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  return <EditProfileClient user={user} />;
}
