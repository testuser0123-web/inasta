'use client';

import { useState } from 'react';
import { Heart, Plus, X, Trash2, BadgeCheck, Loader2, Share2 } from 'lucide-react';
import Link from 'next/link';
import { toggleLike, deletePost, fetchFeedPosts } from '@/app/actions/post';

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
      isVerified?: boolean;
  }
};

export default function Feed({ initialPosts, currentUserId, feedType }: { initialPosts: Post[], currentUserId: number, feedType?: 'all' | 'following' }) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 12);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;

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
    setSelectedPostId(null);
    setIsDeleting(false);
  };

  const loadMore = async () => {
      if (isLoadingMore || !feedType) return;
      
      setIsLoadingMore(true);
      const lastPostId = posts[posts.length - 1]?.id;
      
      try {
          const newPosts = await fetchFeedPosts({ cursorId: lastPostId, feedType });
          if (newPosts.length < 12) {
              setHasMore(false);
          }
          setPosts(prev => [...prev, ...newPosts]);
      } catch (error) {
          console.error("Failed to load more posts", error);
      } finally {
          setIsLoadingMore(false);
      }
  };

  const handleShare = async (postId: number) => {
      const url = `${window.location.origin}/p/${postId}`;
      try {
          await navigator.clipboard.writeText(url);
          setShareFeedback('Link copied!');
          setTimeout(() => setShareFeedback(null), 2000);
      } catch (err) {
          console.error('Failed to copy', err);
          setShareFeedback('Failed to copy');
      }
  };

  return (
    <div className="pb-20">
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => setSelectedPostId(post.id)}
            className="aspect-square relative cursor-pointer bg-gray-100 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/image/${post.id}.jpg`}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Load More Button - Only show if feedType is provided (Home feed) */}
      {feedType && hasMore && (
          <div className="flex justify-center p-6">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
              >
                  {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  Load More
              </button>
          </div>
      )}

      {/* FAB */}
      <Link
        href="/upload"
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </Link>

      {/* Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPostId(null)}>
          <div 
            className="bg-white rounded-lg overflow-hidden w-full max-w-sm relative"
            onClick={(e) => e.stopPropagation()}
          >
             <button 
                onClick={() => setSelectedPostId(null)}
                className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-white z-10 hover:bg-black/40"
             >
                <X className="w-5 h-5" />
             </button>

            <div className="aspect-square relative bg-gray-100">
               {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/image/${selectedPost.id}.jpg`}
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
                    {/* Share Button */}
                    <button
                        onClick={() => handleShare(selectedPost.id)}
                        className="text-gray-700 hover:text-black relative"
                    >
                        <Share2 className="w-6 h-6" />
                        {shareFeedback && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                {shareFeedback}
                            </span>
                        )}
                    </button>
                    {/* Username link */}
                    {selectedPost.user && (
                        <div className="flex items-center gap-1">
                             <Link href={`/users/${selectedPost.user.username}`} className="text-sm font-semibold hover:underline">
                                @{selectedPost.user.username}
                             </Link>
                             {selectedPost.user.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                        </div>
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