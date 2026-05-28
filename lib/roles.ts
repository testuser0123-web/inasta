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

export function getRole(id: string) {
  return ROLES.find((role) => role.id === id);
}
