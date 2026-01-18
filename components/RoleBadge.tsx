import { Palette, Star, Bug, Aperture, Beer } from 'lucide-react';
import { getRole } from '@/lib/roles';

export function RoleBadge({ roleId }: { roleId: string }) {
  const role = getRole(roleId);
  if (!role) return null;

  let Icon;
  switch (roleId) {
    case 'designer':
      Icon = Palette;
      break;
    case 'contributor':
      Icon = Star;
      break;
    case 'bughunter':
      Icon = Bug;
      break;
    case 'inastagrammer':
      Icon = Aperture;
      break;
    case 'drinker':
      Icon = Beer;
      break;
    default:
      return null;
  }

  return (
    <span title={role.name} className="inline-flex items-center justify-center">
      <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
    </span>
  );
}
