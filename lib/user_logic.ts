export interface UserSubscriptionInfo {
  subscriptionAmount: number | null;
  subscriptionDate: Date | null;
  subscriptionExpiresAt: Date | null;
  roles: string[];
  isGold: boolean;
  [key: string]: any;
}

export function isSubscriptionValid(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
}

export function canUseFrame(user: Partial<UserSubscriptionInfo>): boolean {
  return (user.subscriptionAmount || 0) >= 500 && isSubscriptionValid(user.subscriptionExpiresAt || null);
}

export function calculateIsGold(user: Partial<UserSubscriptionInfo>): boolean {
  // If user has subscription >= 300 and not expired
  if ((user.subscriptionAmount || 0) >= 300 && isSubscriptionValid(user.subscriptionExpiresAt || null)) {
    return true;
  }
  return false;
}

export function calculateRoles(user: Partial<UserSubscriptionInfo>): string[] {
  const currentRoles = user.roles ? [...user.roles] : [];

  // Subscriber role: amount >= 100 and not expired
  // Logic: Add 'subscriber' if not present and condition met.
  // Note: We do NOT remove it if condition failed, to avoid flickering if it was somehow persisted or assigned otherwise,
  // unless we want to strictly enforce it.
  // Given the requirement "judge by subscription", strict enforcement seems appropriate for this specific role.
  // But typically we only ADD dynamic roles.

  const isSubscriber = (user.subscriptionAmount || 0) >= 100 && isSubscriptionValid(user.subscriptionExpiresAt || null);

  if (isSubscriber) {
    if (!currentRoles.includes('subscriber')) {
      currentRoles.push('subscriber');
    }
  } else {
    // Optional: Remove it if it shouldn't be there?
    // If the role was manually assigned in DB, we shouldn't remove it.
    // If it's purely dynamic, we should.
    // Since we don't know if it's manual or dynamic in the array (unless we check a separate list of manual roles),
    // we'll stick to additive logic for safety, OR checking if it's the intended behavior.
    // However, usually "judge by X" implies "if and only if X".
    // Let's assume purely dynamic for now.
    // But since we are mapping over DB result, modifying it here only affects the response.
    // So removing it from the response array if invalid is safe IF we assume this role is ONLY for subscribers.
    // But let's just be additive to avoid side effects on other potential uses.
    // Actually, if a user's subscription expires, they should lose the badge.
    // So we SHOULD filter it out if we want to enforce the rule.
    // But we don't know if 'subscriber' is in the DB roles.
    // If it IS in the DB roles, and expired, we should probably hide it.
    // So:
    // if (!isSubscriber && currentRoles.includes('subscriber')) {
    //   return currentRoles.filter(r => r !== 'subscriber');
    // }
    // Let's implement this strict toggle for 'subscriber'.
    if (currentRoles.includes('subscriber')) {
         return currentRoles.filter(r => r !== 'subscriber');
    }
  }

  return currentRoles;
}

export function enrichUser<T extends Partial<UserSubscriptionInfo>>(user: T): T {
  if (!user) return user;

  return {
    ...user,
    isGold: calculateIsGold(user),
    roles: calculateRoles(user),
  };
}
