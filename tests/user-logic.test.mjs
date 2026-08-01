import assert from 'node:assert/strict';
import { calculateIsGold, enrichUser } from '../lib/user_logic.ts';

console.log('Running user logic unit tests...');

// 1. Test user who has isGold flag directly set to true (e.g. database/admin)
const adminUser = {
  isGold: true,
  subscriptionAmount: 0,
  subscriptionExpiresAt: null,
  roles: []
};

assert.strictEqual(calculateIsGold(adminUser), true, 'calculateIsGold should return true if user.isGold is already true');

const enrichedAdmin = enrichUser(adminUser);
assert.strictEqual(enrichedAdmin.isGold, true, 'enrichUser should preserve isGold=true even if subscription parameters are empty/invalid');

// 2. Test user who gets gold status through active subscription
const subscriberGoldUser = {
  isGold: false,
  subscriptionAmount: 500,
  subscriptionExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days in the future
  roles: []
};

assert.strictEqual(calculateIsGold(subscriberGoldUser), true, 'calculateIsGold should return true if subscription amount >= 300 and not expired');

const enrichedSubGold = enrichUser(subscriberGoldUser);
assert.strictEqual(enrichedSubGold.isGold, true, 'enrichUser should set isGold=true for eligible active subscribers');

// 3. Test user with expired subscription
const expiredSubUser = {
  isGold: false,
  subscriptionAmount: 500,
  subscriptionExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day in the past
  roles: []
};

assert.strictEqual(calculateIsGold(expiredSubUser), false, 'calculateIsGold should return false if subscription has expired');

const enrichedExpiredSub = enrichUser(expiredSubUser);
assert.strictEqual(enrichedExpiredSub.isGold, false, 'enrichUser should set isGold=false for expired subscribers');

// 4. Test user with insufficient subscription amount
const cheapSubUser = {
  isGold: false,
  subscriptionAmount: 150,
  subscriptionExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days in the future
  roles: []
};

assert.strictEqual(calculateIsGold(cheapSubUser), false, 'calculateIsGold should return false if subscription amount is < 300');

const enrichedCheapSub = enrichUser(cheapSubUser);
assert.strictEqual(enrichedCheapSub.isGold, false, 'enrichUser should set isGold=false if subscription amount is < 300');

console.log('All user logic unit tests passed successfully!');
