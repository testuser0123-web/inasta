import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { db as prisma } from '@/lib/db';
import RoleManagementClient from './RoleManagementClient';

export default async function RoleManagementPage() {
  const session = await getSession();
  if (!session?.id) redirect('/login');

  const adminUserId = process.env.ADMIN_USER_ID;
  const isGlobalAdmin = !!(adminUserId && String(session.id) === adminUserId);

  let isRoleManager = isGlobalAdmin;

  if (!isRoleManager) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { roles: true },
    });
    if (user && user.roles.includes('role_manager')) {
      isRoleManager = true;
    }
  }

  if (!isRoleManager) {
    notFound(); // Hide from unauthorized users
  }

  return <RoleManagementClient isGlobalAdmin={isGlobalAdmin} />;
}
