'use client';

import { useState } from 'react';
import { Settings, Grid, Heart, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Feed from '@/components/Feed';
import ProfileHeader from '@/components/ProfileHeader';
import VerificationModal from '@/components/VerificationModal';
import { useRouter } from 'next/navigation';

type Post = {
    id: number;
    // imageUrl: string;
    comment: string | null;
    likesCount: number;
    hasLiked: boolean;
    userId: number;
    user?: {
        username: string;
        avatarUrl: string | null;
        isVerified?: boolean;
    };
    hashtags?: { name: string }[];
};

type ProfileClientProps = {
  user: {
    id: number;
    username: string;
    avatarUrl: string | null;
    isVerified: boolean;
    bio?: string | null;
    oshi?: string | null;
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
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const router = useRouter();

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
            <div className="flex flex-col gap-2 max-w-xs mx-auto mb-6">
                <Link
                    href="/profile/edit"
                    className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                </Link>
                
                {!user.isVerified && (
                    <button
                        onClick={() => setIsVerificationModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Verify Account
                    </button>
                )}
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
