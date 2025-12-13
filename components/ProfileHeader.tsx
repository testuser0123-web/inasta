'use client';

import { useState } from 'react';
import { BadgeCheck, MoreHorizontal, Heart } from 'lucide-react';
import Link from 'next/link';
import { followUser, unfollowUser, muteUser, unmuteUser } from '@/app/actions/user';

type ProfileHeaderProps = {
  user: {
    id: number;
    username: string;
    avatarUrl: string | null;
    isVerified?: boolean;
    isGold?: boolean;
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

  const handleFollowToggle = async () => {
    // ... logic ...
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
     // ... logic ...
    setStatus(prev => ({ ...prev, isMuted: !prev.isMuted }));
    setIsMenuOpen(false); // Close menu
    
    if (status.isMuted) {
      await unmuteUser(user.id);
    } else {
        if (confirm(`Are you sure you want to mute @${user.username}? Their posts will not appear in your ALL feed.`)) {
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
      </div>

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
             <span className="text-gray-500 dark:text-gray-400">Followers</span>
         </Link>
         <Link href={`/users/${user.username}/following`} className="text-center hover:opacity-70 transition-opacity">
             <span className="font-bold block">{counts.following}</span>
             <span className="text-gray-500 dark:text-gray-400">Following</span>
         </Link>
      </div>

      {trophies && (trophies.gold > 0 || trophies.silver > 0 || trophies.bronze > 0) && (
          <div className="flex gap-4 mb-6 bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800">
             {trophies.gold > 0 && (
                <div className="flex flex-col items-center">
                   <span className="text-xl">🥇</span>
                   <span className="text-xs font-bold">{trophies.gold}</span>
                </div>
             )}
             {trophies.silver > 0 && (
                <div className="flex flex-col items-center">
                   <span className="text-xl">🥈</span>
                   <span className="text-xs font-bold">{trophies.silver}</span>
                </div>
             )}
             {trophies.bronze > 0 && (
                <div className="flex flex-col items-center">
                   <span className="text-xl">🥉</span>
                   <span className="text-xs font-bold">{trophies.bronze}</span>
                </div>
             )}
          </div>
      )}

      {!status.isMe && currentUser && (
        <div className="flex items-center gap-2">
           <button
             onClick={handleFollowToggle}
             className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                 status.isFollowing 
                 ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                 : 'bg-indigo-600 text-white hover:bg-indigo-700'
             }`}
           >
             {status.isFollowing ? 'Following' : 'Follow'}
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
                           {status.isMuted ? 'Unmute' : 'Mute'}
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
