'use client';

import { useState, useTransition } from 'react';
import { Grid, Heart, Book, Settings, UserPen } from 'lucide-react';
import Link from 'next/link';
import ProfileHeader from './ProfileHeader';
import Feed from './Feed';
import { DiaryGrid } from '@/app/diary/DiaryGrid';

type Post = {
  id: number;
  imageUrl?: string;
  mediaType?: "IMAGE" | "VIDEO";
  thumbnailUrl?: string | null;
  comment: string | null;
  isSpoiler?: boolean;
  createdAt: Date;
  likesCount: number;
  hasLiked: boolean;
  userId: number;
  user?: {
      username: string;
      avatarUrl: string | null;
      isVerified?: boolean;
      isGold?: boolean;
      roles?: string[];
  };
  comments?: any[];
  hashtags?: { name: string }[];
  images?: { id: number; order: number; url?: string }[];
};

type Diary = {
    id: number;
    date: Date;
    title: string | null;
    content: any;
    thumbnailUrl: string | null;
};

type ProfileClientProps = {
  user: {
    id: number;
    username: string;
    avatarUrl: string | null;
    isVerified?: boolean;
    isGold?: boolean;
    roles?: string[];
    bio?: string | null;
    oshi?: string | null;
    _count: {
        followers: number;
        following: number;
    };
  };
  currentUser: {
    id: number;
    username: string;
    avatarUrl?: string | null;
  } | null;
  posts: Post[];
  likedPosts: Post[];
  diaries: Diary[];
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
  isGuest?: boolean;
};

export default function ProfileClient({ user, currentUser, posts, likedPosts, diaries, initialStatus, trophies, isGuest }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'likes' | 'diary'>('posts');
  const [isPending, startTransition] = useTransition();

  const handleTabChange = (tab: 'posts' | 'likes' | 'diary') => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  return (
    <div>
      <div className="pt-6 pb-2 px-4">
          <ProfileHeader
              user={user}
              currentUser={currentUser}
              initialCounts={{
                  followers: user._count.followers,
                  following: user._count.following
              }}
              initialStatus={initialStatus}
              trophies={trophies}
              isGuest={isGuest}
          />

          {/* Edit Profile & Settings Buttons (Only for Me) */}
          {initialStatus.isMe && !isGuest && (
              <div className="flex gap-2 justify-center mb-6">
                  <Link
                      href="/profile/edit"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                      <UserPen className="w-4 h-4" />
                      Edit Profile
                  </Link>
                  <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                      <Settings className="w-4 h-4" />
                      Settings
                  </Link>
              </div>
          )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="flex">
          <button
            onClick={() => handleTabChange('posts')}
            className={`flex-1 py-3 flex justify-center items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span className="text-sm font-medium">Posts</span>
          </button>
          {initialStatus.isMe && (
            <button
                onClick={() => handleTabChange('diary')}
                className={`flex-1 py-3 flex justify-center items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'diary'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
                <Book className="w-5 h-5" />
                <span className="text-sm font-medium">Diary</span>
            </button>
          )}
          <button
            onClick={() => handleTabChange('likes')}
            className={`flex-1 py-3 flex justify-center items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'likes'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-sm font-medium">Likes</span>
          </button>
        </div>
      </div>

      <div className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {activeTab === 'posts' && (
          <Feed
              initialPosts={posts}
              currentUserId={currentUser?.id ?? -1}
              // We pass null for feedType to disable pagination/load more in this profile view if needed,
              // OR we can implement user specific pagination later.
              // For now, infinite scroll on profile is supported via 'user_posts' feedType.
              feedType="user_posts"
              targetUserId={user.id}
              isGuest={isGuest}
          />
        )}
        {activeTab === 'diary' && (
             <DiaryGrid
                diaries={diaries}
                // Remove props that are not expected by DiaryGrid if needed.
                // Looking at DiaryGrid definition: { diaries: DiaryEntry[] }
                // It does NOT accept 'year', 'month', 'isMe'.
                // I should fix this call.
            />
        )}
        {activeTab === 'likes' && (
          <Feed
              initialPosts={likedPosts}
              currentUserId={currentUser?.id ?? -1}
              feedType="user_likes"
              targetUserId={user.id}
              isGuest={isGuest}
          />
        )}
      </div>
    </div>
  );
}
