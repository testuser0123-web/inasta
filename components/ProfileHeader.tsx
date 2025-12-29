'use client';

import { useState } from 'react';
import { BadgeCheck, MoreHorizontal, Heart, Trophy } from 'lucide-react';
import Link from 'next/link';
import { followUser, unfollowUser, muteUser, unmuteUser } from '@/app/actions/user';
import { RoleBadge } from '@/components/RoleBadge';

type ProfileHeaderProps = {
  user: {
    id: number;
    username: string;
    avatarUrl: string | null;
    isVerified?: boolean;
    isGold?: boolean;
    roles?: string[];
    bio?: string | null;
    oshi?: string | null;
  };
  currentUser: {
    id: number;
    username: string;
    avatarUrl?: string | null;
  } | null;
  initialCounts: {
    followers: number;
    following: number;
  };
  initialStatus: {
    isFollowing: boolean;
    isMuted: boolean;
    isMe: boolean;
  };
  trophies?: {
      gold: number;
      silver: number;
      bronze: number;
  };
};

export default function ProfileHeader({ user, currentUser, initialCounts, initialStatus, trophies }: ProfileHeaderProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [status, setStatus] = useState(initialStatus);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Guest or no session
  const isGuest = !currentUser || !currentUser.id;

  const handleFollowToggle = async () => {
    if (isGuest) return;

    // Optimistic update
    setStatus(prev => ({ ...prev, isFollowing: !prev.isFollowing }));
    setCounts(prev => ({
      ...prev,
      followers: prev.followers + (status.isFollowing ? -1 : 1)
    }));

    if (status.isFollowing) {
      await unfollowUser(user.id);
    } else {
      await followUser(user.id);
    }
  };

  const handleMuteToggle = async () => {
    if (isGuest) return;

    setStatus(prev => ({ ...prev, isMuted: !prev.isMuted }));
    setIsMenuOpen(false); // Close menu
    
    if (status.isMuted) {
      await unmuteUser(user.id);
    } else {
        if (confirm(`@${user.username}をミュートしてよろしいですか?`)) {
            await muteUser(user.id);
        } else {
             // Revert if cancelled
            setStatus(prev => ({ ...prev, isMuted: !prev.isMuted }));
        }
    }
  };

  return (
    <div className="flex flex-col items-center mb-6 text-gray-900 dark:text-gray-100">
      <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-4xl font-bold">
            {user.username[0].toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1 mb-2">
        <h2 className="text-xl font-bold">@{user.username}</h2>
        {user.isGold ? (
          <BadgeCheck className="w-5 h-5 text-yellow-500 fill-yellow-500/10" />
        ) : user.isVerified ? (
          <BadgeCheck className="w-5 h-5 text-blue-500" />
        ) : null}
        {user.roles?.map(roleId => (
          <RoleBadge key={roleId} roleId={roleId} />
        ))}
      </div>

      {trophies && (trophies.gold > 0 || trophies.silver > 0 || trophies.bronze > 0) && (
          <div className="flex gap-3 mb-3 bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-full border border-gray-100 dark:border-gray-800">
              {trophies.gold > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                      <Trophy className="w-4 h-4 fill-yellow-500" />
                      <span>{trophies.gold}</span>
                  </div>
              )}
              {trophies.silver > 0 && (
                  <div className="flex items-center gap-1 text-gray-400 font-bold text-sm">
                      <Trophy className="w-4 h-4 fill-gray-400" />
                      <span>{trophies.silver}</span>
                  </div>
              )}
              {trophies.bronze > 0 && (
                  <div className="flex items-center gap-1 text-amber-700 font-bold text-sm">
                      <Trophy className="w-4 h-4 fill-amber-700" />
                      <span>{trophies.bronze}</span>
                  </div>
              )}
          </div>
      )}

      {(user.bio || user.oshi) && (
          <div className="flex flex-col items-center gap-1 mb-4 max-w-md text-center px-4">
              {user.oshi && (
                  <div className="text-pink-500 font-medium text-sm flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-current" />
                      <span>{user.oshi}</span>
                  </div>
              )}
              {user.bio && (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">{user.bio}</p>
              )}
          </div>
      )}
      
      <div className="flex gap-6 mb-4 text-sm">
         <Link href={`/users/${user.username}/followers`} className="text-center hover:opacity-70 transition-opacity">
             <span className="font-bold block">{counts.followers}</span>
             <span className="text-gray-500 dark:text-gray-400">フォロワー</span>
         </Link>
         <Link href={`/users/${user.username}/following`} className="text-center hover:opacity-70 transition-opacity">
             <span className="font-bold block">{counts.following}</span>
             <span className="text-gray-500 dark:text-gray-400">フォロー中</span>
         </Link>
      </div>

      {!status.isMe && currentUser && !isGuest && (
        <div className="flex items-center gap-2">
           <button
             onClick={handleFollowToggle}
             className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                 status.isFollowing 
                 ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                 : 'bg-primary text-white hover:bg-primary-hover'
             }`}
           >
             {status.isFollowing ? 'フォロー中' : 'フォロー'}
           </button>
           
           <div className="relative">
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
             >
                <MoreHorizontal className="w-6 h-6" />
             </button>
             
             {isMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                   <div className="absolute top-full right-0 mt-1 w-32 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                       <button 
                         onClick={handleMuteToggle}
                         className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                       >
                           {status.isMuted ? 'ミュート解除' : 'ミュート'}
                       </button>
                   </div>
                 </>
             )}
           </div>
        </div>
      )}
    </div>
  );
}
