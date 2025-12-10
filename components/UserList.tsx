'use client';

import Link from 'next/link';
import { User as UserIcon, BadgeCheck } from 'lucide-react';

type User = {
  id: number;
  username: string;
  avatarUrl: string | null;
  isVerified?: boolean;
};

type UserListProps = {
  users: User[];
};

export default function UserList({ users }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
        <p>No users found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/users/${user.username}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{user.username}</span>
            {user.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
          </div>
        </Link>
      ))}
    </div>
  );
}
