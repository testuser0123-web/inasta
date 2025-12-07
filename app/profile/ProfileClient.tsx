'use client';

import Feed from '@/components/Feed';
import EditProfileForm from '@/components/EditProfileForm';
import { useState } from 'react';
import { Grid, Heart } from 'lucide-react';

type User = {
    id: number;
    username: string;
    avatarUrl: string | null;
}

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
}

export default function ProfileClient({ user, myPosts, likedPosts }: { user: User, myPosts: Post[], likedPosts: Post[] }) {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');

    return (
        <>
            <div className="p-4 flex flex-col items-center border-b mb-1 relative">
                <div className="w-20 h-20 bg-gray-200 rounded-full mb-2 overflow-hidden">
                    {user.avatarUrl ? (
                         // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
                            {user.username[0].toUpperCase()}
                        </div>
                    )}
                </div>
                <h2 className="font-semibold text-lg">@{user.username}</h2>
                <div className="flex gap-4 text-sm text-gray-500 mb-2">
                    <span><b>{myPosts.length}</b> posts</span>
                    <span><b>{likedPosts.length}</b> likes</span>
                </div>
                
                <button 
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 border border-gray-300 rounded-md text-sm font-semibold hover:bg-gray-50"
                >
                    Edit Profile
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${
                        activeTab === 'posts' 
                        ? 'border-black text-black' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Grid className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setActiveTab('likes')}
                    className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${
                        activeTab === 'likes' 
                        ? 'border-black text-black' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Heart className={`w-6 h-6 ${activeTab === 'likes' ? 'fill-black' : ''}`} />
                </button>
            </div>

            <Feed 
                key={activeTab} // Force re-mount to update initialPosts
                initialPosts={activeTab === 'posts' ? myPosts : likedPosts} 
                currentUserId={user.id} 
            />

            {isEditing && (
                <EditProfileForm 
                    user={user} 
                    onClose={() => setIsEditing(false)} 
                />
            )}
        </>
    );
}
