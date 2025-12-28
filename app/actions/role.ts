'use server';

import { db as prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { RoleId, ROLES } from '@/lib/roles';

// Helper to check if current user is global admin (env based)
function isGlobalAdmin(userId: number): boolean {
  const adminUserId = process.env.ADMIN_USER_ID;
  return !!(adminUserId && String(userId) === adminUserId);
}

// Helper to check if current user is role manager
async function isRoleManager(userId: number): Promise<boolean> {
  // Global admin is always a role manager
  if (isGlobalAdmin(userId)) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  return user?.roles.includes('role_manager') ?? false;
}


export async function searchUserByUsername(username: string) {
  const session = await getSession();
  if (!session?.id) throw new Error('Unauthorized');

  if (!(await isRoleManager(session.id))) {
      throw new Error('Forbidden');
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      roles: true,
    },
  });

  return user;
}

export async function addRole(targetUserId: number, roleId: string) {
  const session = await getSession();
  if (!session?.id) throw new Error('Unauthorized');

  // Must be role manager
  if (!(await isRoleManager(session.id))) {
    throw new Error('Forbidden');
  }

  // Validate role exists
  const roleExists = ROLES.some((r) => r.id === roleId);
  if (!roleExists) throw new Error('Invalid role');

  // Special check for adding 'role_manager' role: Only global admin can do this
  if (roleId === 'role_manager') {
    if (!isGlobalAdmin(session.id)) {
      throw new Error('Only the main administrator can grant Role Manager permissions.');
    }
  }

  // Fetch target user's current roles
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { roles: true },
  });

  if (!targetUser) throw new Error('User not found');

  // If already has role, do nothing
  if (targetUser.roles.includes(roleId)) {
    return;
  }

  // Add role
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      roles: {
        push: roleId,
      },
    },
  });

  revalidatePath('/admin/roles');
}

export async function removeRole(targetUserId: number, roleId: string) {
  const session = await getSession();
  if (!session?.id) throw new Error('Unauthorized');

  // Must be role manager
  if (!(await isRoleManager(session.id))) {
    throw new Error('Forbidden');
  }

  // Special check for removing 'role_manager' role: Only global admin can do this
  if (roleId === 'role_manager') {
    if (!isGlobalAdmin(session.id)) {
      throw new Error('Only the main administrator can revoke Role Manager permissions.');
    }
  }

  const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { roles: true },
  });

  if (!targetUser) throw new Error('User not found');

  const newRoles = targetUser.roles.filter(r => r !== roleId);

  await prisma.user.update({
      where: { id: targetUserId },
      data: {
          roles: newRoles
      }
  });

  revalidatePath('/admin/roles');
}
