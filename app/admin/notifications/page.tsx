import { getSession } from '@/lib/auth';
import { notFound } from 'next/navigation';
import AdminNotificationForm from './AdminNotificationForm';

export default async function AdminNotificationPage() {
  const session = await getSession();

  // Developer access check
  const adminId = process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID, 10) : null;

  if (!session || !adminId || session.id !== adminId) {
    notFound();
  }

  return <AdminNotificationForm />;
}
