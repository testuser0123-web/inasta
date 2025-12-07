'use client';

import { useState, useEffect } from 'react';
import { Heart, Plus, X, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toggleLike, deletePost } from '@/app/actions/post';

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

export default function Feed({ initialPosts, currentUserId }: { initialPosts: Post[], currentUserId: number }) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync selectedPost with posts when posts change (e.g. after like toggle)
  useEffect(() => {
    if (selectedPost) {
        const updatedPost = posts.find(p => p.id === selectedPost.id);
        if (updatedPost) {
            setSelectedPost(updatedPost);
        }
    }
  }, [posts, selectedPost]);

  const handleLike = async (post: Post) => {
    // Optimistic update
    setPosts((current) =>
      current.map((p) =>
        p.id === post.id 
            ? { 
                ...p, 
                likesCount: p.hasLiked ? p.likesCount - 1 : p.likesCount + 1,
                hasLiked: !p.hasLiked
              } 
            : p
      )
    );
    
    await toggleLike(post.id);
  };

  const handleDelete = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    setIsDeleting(true);
    await deletePost(postId);
    
    // Optimistic remove
    setPosts((current) => current.filter((p) => p.id !== postId));
    setSelectedPost(null);
    setIsDeleting(false);
  };

  return (
    <div className="pb-20">
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => setSelectedPost(post)}
            className="aspect-square relative cursor-pointer bg-gray-100 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* FAB */}
      <Link
        href="/upload"
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </Link>

      {/* Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPost(null)}>
          <div 
            className="bg-white rounded-lg overflow-hidden w-full max-w-sm relative"
            onClick={(e) => e.stopPropagation()}
          >
             <button 
                onClick={() => setSelectedPost(null)}
                className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-white z-10 hover:bg-black/40"
             >
                <X className="w-5 h-5" />
             </button>

            <div className="aspect-square relative bg-gray-100">
               {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPost.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleLike(selectedPost)}
                        className="flex items-center gap-1.5 transition-colors group"
                    >
                        <Heart 
                            className={`w-6 h-6 transition-colors ${
                                selectedPost.hasLiked 
                                    ? 'fill-red-500 text-red-500' 
                                    : 'text-gray-700 group-hover:text-red-500'
                            }`} 
                        />
                        <span className="font-semibold text-gray-700">{selectedPost.likesCount}</span>
                    </button>
                    {/* Username link */}
                    {selectedPost.user && (
                         <Link href={`/users/${selectedPost.user.username}`} className="text-sm font-semibold hover:underline">
                            @{selectedPost.user.username}
                         </Link>
                    )}
                </div>

                {currentUserId === selectedPost.userId && (
                   <button
                    onClick={() => handleDelete(selectedPost.id)}
                    disabled={isDeleting}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                )}
              </div>
              
              {selectedPost.comment && (
                <p className="text-gray-900 break-words">{selectedPost.comment}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}