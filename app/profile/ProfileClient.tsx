'use client';

import Link from 'next/link';
import { Grid, Heart, Settings, ShieldCheck, MoreHorizontal, Book } from 'lucide-react';
import { useState, useTransition } from 'react';
import Feed from '@/components/Feed';
import { useRouter } from 'next/navigation';
import VerificationModal from '@/components/VerificationModal';
import ProfileHeader from '@/components/ProfileHeader';
import { Spinner } from '@/components/ui/spinner';
import { DiaryGrid } from '../diary/DiaryGrid';

type ProfileClientProps = {
  user: any;
  currentUser: any;
  posts: any[];
  likedPosts: any[];
  diaries?: any[];
  initialStatus: {
      isFollowing: boolean;
      isMuted: boolean;
      isMe: boolean;
  };
  trophies: {
      gold: number;
      silver: number;
      bronze: number;
  };
};

export default function ProfileClient({ user, currentUser, posts, likedPosts = [], diaries = [], initialStatus, trophies }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'likes' | 'diaries'>('posts');
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleTabChange = (tab: 'posts' | 'likes' | 'diaries') => {
    startTransition(() => {
        setActiveTab(tab);
    });
  };

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
             trophies={trophies}
         />
         
         {initialStatus.isMe && (
            <div className="flex flex-col gap-2 max-w-xs mx-auto mb-6">
                <Link
                    href="/profile/edit"
                    className="flex items-center justify-center gap-2 px-4 py-2 border dark:border-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-gray-100"
                >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                </Link>

                <Link
                    href="/settings"
                    className="flex items-center justify-center gap-2 px-4 py-2 border dark:border-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-gray-100"
                >
                    <MoreHorizontal className="w-4 h-4" />
                    Other Settings
                </Link>
                
                {!user.isVerified && (
                    <button
                        onClick={() => setIsVerificationModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 rounded-lg text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Verify Account
                    </button>
                )}
            </div>
         )}

         {/* Tabs */}
         <div className="flex border-b dark:border-gray-800 mt-4">
            <button
                onClick={() => handleTabChange('posts')}
                className={`flex-1 flex items-center justify-center py-3 text-sm font-medium transition-colors ${
                    activeTab === 'posts' ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
            >
                <Grid className="w-5 h-5 mr-2" />
                Posts
            </button>
            <button
                onClick={() => handleTabChange('diaries')}
                className={`flex-1 flex items-center justify-center py-3 text-sm font-medium transition-colors ${
                    activeTab === 'diaries' ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
            >
                <Book className="w-5 h-5 mr-2" />
                日記
            </button>
            {initialStatus.isMe && (
                <button
                    onClick={() => handleTabChange('likes')}
                    className={`flex-1 flex items-center justify-center py-3 text-sm font-medium transition-colors ${
                        activeTab === 'likes' ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                    }`}
                >
                    <Heart className="w-5 h-5 mr-2" />
                    Likes
                </button>
            )}
         </div>
      </div>

      {isPending ? (
          <div className="flex justify-center p-10">
              <Spinner />
          </div>
      ) : (
        <>
            {activeTab === 'posts' && (
                <Feed
                    key="posts"
                    initialPosts={posts}
                    currentUserId={currentUser?.id ?? -1}
                    feedType="user_posts"
                    targetUserId={user.id}
                />
            )}
            {activeTab === 'diaries' && (
                <div className="p-4">
                    <DiaryGrid diaries={diaries} />
                </div>
            )}
            {activeTab === 'likes' && (
                <Feed
                    key="likes"
                    initialPosts={likedPosts}
                    currentUserId={currentUser?.id ?? -1}
                    feedType="user_likes"
                    targetUserId={user.id}
                />
            )}
        </>
      )}

      <VerificationModal 
        isOpen={isVerificationModalOpen} 
        onClose={() => setIsVerificationModalOpen(false)}
        onVerified={() => {
            router.refresh();
        }}
      />
    </div>
  );
}
