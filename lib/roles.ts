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
] as const;

export type RoleId = typeof ROLES[number]['id'];

export function getRole(id: string) {
  return ROLES.find((role) => role.id === id);
}
