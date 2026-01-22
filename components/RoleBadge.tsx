'use client';

import { useState } from 'react';
import { Palette, Star, Bug, Aperture, Beer, BookMarked } from 'lucide-react';
import { getRole } from '@/lib/roles';

const ROLE_NAMES: Record<string, string> = {
  designer: 'デザイナー',
  contributor: 'コントリビューター',
  bughunter: 'バグハンター',
  inastagrammer: 'イナスタグラマー',
  role_manager: 'ロール管理者',
  drinker: 'ドリンカー',
  subscriber: 'サポーター',
};

export function RoleBadge({ roleId }: { roleId: string }) {
  const [isOpen, setIsOpen] = useState(false);
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
    case 'subscriber':
      Icon = BookMarked;
      break;
    default:
      return null;
  }

  const toggleTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => setIsOpen(false), 3000);
    }
  };

  const displayName = ROLE_NAMES[roleId] || role.name;

  return (
    <span
      title={displayName}
      className="relative inline-flex items-center justify-center cursor-pointer"
      onClick={toggleTooltip}
    >
      <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />

      {isOpen && (
        <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-50 pointer-events-none select-none">
          {displayName}
        </span>
      )}
    </span>
  );
}
