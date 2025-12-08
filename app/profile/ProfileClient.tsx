'use client';

import { useState } from 'react';
import { Settings, Grid, Heart } from 'lucide-react';
import Link from 'next/link';
import Feed from '@/components/Feed';
import ProfileHeader from '@/components/ProfileHeader';

type Post = {
    id: number;
    imageUrl: string;
    comment: string | null;
    likesCount: number;
    hasLiked: boolean;
    userId: number;
    user?: {
        username: string;
        avatarUrl: string | null;
    }
};

type ProfileClientProps = {
  user: {
    id: number;
    username: string;
    avatarUrl: string | null;
    _count: {
        followers: number;
        following: number;
    }
  };
  currentUser: {
    id: number;
    username: string;
  } | null;
  posts: Post[];
  likedPosts?: Post[];
  initialStatus: {
    isFollowing: boolean;
    isMuted: boolean;
    isMe: boolean;
  };
};

export default function ProfileClient({ user, currentUser, posts, likedPosts = [], initialStatus }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');

  return (
    <div>
      <div className="pt-6 px-4">
         <ProfileHeader 
             user={user} 
             currentUser={currentUser} 
             initialCounts={{
                 followers: user._count.followers,
                 following: user._count.following
             }}
             initialStatus={initialStatus}
         />
         
         {initialStatus.isMe && (
            <div className="flex justify-center mb-6">
                <Link
                    href="/profile/edit"
                    className="w-full max-w-xs flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                </Link>
            </div>
         )}

         {/* Tabs - only show for me */}
         {initialStatus.isMe ? (
             <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`flex-1 flex items-center justify-center py-3 text-sm font-medium transition-colors ${
                        activeTab === 'posts' ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-black'
                    }`}
                >
                    <Grid className="w-5 h-5 mr-2" />
                    Posts
                </button>
                <button
                    onClick={() => setActiveTab('likes')}
                    className={`flex-1 flex items-center justify-center py-3 text-sm font-medium transition-colors ${
                        activeTab === 'likes' ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-black'
                    }`}
                >
                    <Heart className="w-5 h-5 mr-2" />
                    Likes
                </button>
             </div>
         ) : (
             <div className="border-t border-gray-100 mt-4" />
         )}
      </div>

      {activeTab === 'posts' ? (
        <Feed key="posts" initialPosts={posts} currentUserId={currentUser?.id ?? -1} />
      ) : (
        <Feed key="likes" initialPosts={likedPosts} currentUserId={currentUser?.id ?? -1} />
      )}
    </div>
  );
}
