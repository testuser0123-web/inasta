export const ROLES = [
  {
    id: 'designer',
    name: 'Designer',
  },
  {
    id: 'contributor',
    name: 'Contributor',
  },
  {
    id: 'bughunter',
    name: 'BugHunter',
  },
  {
    id: 'inastagrammer',
    name: 'Inastagrammer',
  },
  {
    id: 'role_manager',
    name: 'Role Manager',
  },
  {
    id: 'drinker',
    name: 'Drinker',
  },
  {
    id: 'subscriber',
    name: 'Subscriber',
  },
  {
    id: 'tokimeki_express',
    name: 'トキメキエクスプレス',
  },
  {
    id: 'bloom_garden_party',
    name: 'Bloom Garden Party',
  },
  {
    id: 'chutorier_live',
    name: 'ちゅーとりえらいぶ',
  },
  {
    id: 'repeat',
    name: 'repeat',
  },
] as const;

export type RoleId = typeof ROLES[number]['id'];

export const SELF_SELECTABLE_ROLE_IDS = [
  'tokimeki_express',
  'bloom_garden_party',
  'chutorier_live',
  'repeat',
] as const satisfies readonly RoleId[];

export type SelfSelectableRoleId = typeof SELF_SELECTABLE_ROLE_IDS[number];

export function isSelfSelectableRole(id: string): id is SelfSelectableRoleId {
  return SELF_SELECTABLE_ROLE_IDS.includes(id as SelfSelectableRoleId);
}

export function getRole(id: string) {
  return ROLES.find((role) => role.id === id);
}
