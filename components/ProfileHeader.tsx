'use client';

import { useState } from 'react';
import { BadgeCheck, MoreHorizontal } from 'lucide-react';
import { followUser, unfollowUser, muteUser, unmuteUser } from '@/app/actions/user';

type ProfileHeaderProps = {
  user: {
    id: number;
    username: string;
    avatarUrl: string | null;
    isVerified?: boolean;
  };
  currentUser: {
    id: number;
    username: string;
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
};

export default function ProfileHeader({ user, currentUser, initialCounts, initialStatus }: ProfileHeaderProps) {
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
    <div className="flex flex-col items-center mb-6">
      <div className="w-24 h-24 bg-gray-200 rounded-full mb-4 overflow-hidden">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold">
            {user.username[0].toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1 mb-2">
        <h2 className="text-xl font-bold">@{user.username}</h2>
        {user.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
      </div>
      
      <div className="flex gap-6 mb-4 text-sm">
         <div className="text-center">
             <span className="font-bold block">{counts.followers}</span>
             <span className="text-gray-500">Followers</span>
         </div>
         <div className="text-center">
             <span className="font-bold block">{counts.following}</span>
             <span className="text-gray-500">Following</span>
         </div>
      </div>

      {!status.isMe && currentUser && (
        <div className="flex items-center gap-2">
           <button
             onClick={handleFollowToggle}
             className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                 status.isFollowing 
                 ? 'bg-gray-200 text-black hover:bg-gray-300' 
                 : 'bg-indigo-600 text-white hover:bg-indigo-700'
             }`}
           >
             {status.isFollowing ? 'Following' : 'Follow'}
           </button>
           
           <div className="relative">
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
             >
                <MoreHorizontal className="w-6 h-6" />
             </button>
             
             {isMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                   <div className="absolute top-full right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg z-20 overflow-hidden">
                       <button 
                         onClick={handleMuteToggle}
                         className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 text-red-600"
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
