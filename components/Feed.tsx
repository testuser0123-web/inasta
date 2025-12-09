'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, Plus, X, Trash2, BadgeCheck, Loader2, Share2, Send, User as UserIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toggleLike, deletePost, fetchFeedPosts } from '@/app/actions/post';
import { addComment } from '@/app/actions/comment';

type Comment = {
  id: number;
  text: string;
  userId: number;
  user: {
      username: string;
      avatarUrl: string | null;
  };
};

type Post = {
  id: number;
  // imageUrl: string; // Removed from payload
  comment: string | null;
  likesCount: number;
  hasLiked: boolean;
  userId: number;
  user?: {
      username: string;
      avatarUrl: string | null;
      isVerified?: boolean;
  };
  comments?: Comment[];
  hashtags?: { name: string }[];
  images?: { id: number; order: number }[];
};

export default function Feed({ initialPosts, currentUserId, feedType, searchQuery }: { initialPosts: Post[], currentUserId: number, feedType?: 'all' | 'following' | 'search', searchQuery?: string }) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 12);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setPosts(initialPosts);
    setHasMore(initialPosts.length >= 12); // Reset hasMore when initialPosts change (e.g. tab switch)
  }, [initialPosts]);

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
          const newPosts = await fetchFeedPosts({ cursorId: lastPostId, feedType, searchQuery });
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
      const url = `${window.location.origin}/api/image/${postId}.jpg`;
      try {
          await navigator.clipboard.writeText(url);
          setShareFeedback('Link copied!');
          setTimeout(() => setShareFeedback(null), 2000);
      } catch (err) {
          console.error('Failed to copy', err);
          setShareFeedback('Failed to copy');
      }
  };

  const handleAddComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPost || !commentText.trim()) return;

      setIsSubmittingComment(true);

      const formData = new FormData();
      formData.append('postId', selectedPost.id.toString());
      formData.append('text', commentText);

      const result = await addComment(null, formData);

      if (result?.success) {
          setCommentText('');
          // Re-fetch data using router refresh instead of full reload to avoid client-side exceptions
          router.refresh();
      } else {
          alert(result?.message || 'Failed to add comment');
      }

      setIsSubmittingComment(false);
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
              className="w-full h-full object-contain"
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
            className="bg-white rounded-lg overflow-hidden w-full max-w-sm relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
             <button 
                onClick={() => setSelectedPostId(null)}
                className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-white z-10 hover:bg-black/40"
             >
                <X className="w-5 h-5" />
             </button>

            <ImageCarousel post={selectedPost} />

            <div className="p-4 overflow-y-auto flex-1">
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
                    {/* Username link with Avatar */}
                    {selectedPost.user && (
                        <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                {selectedPost.user.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={selectedPost.user.avatarUrl} alt={selectedPost.user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500">
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                )}
                             </div>
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
                <p className="text-gray-900 break-words mb-2">{selectedPost.comment}</p>
              )}

              {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {selectedPost.hashtags.map((tag) => (
                    <Link
                      key={tag.name}
                      href={`/?feed=search&q=${tag.name.replace('#', '')}`}
                      className="text-blue-500 text-sm hover:underline"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Comments Section */}
              <div className="space-y-3 border-t pt-3">
                  {selectedPost.comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-2 items-start text-sm">
                          <Link href={`/users/${comment.user.username}`} className="font-bold hover:underline shrink-0">
                              {comment.user.username}
                          </Link>
                          <span className="text-gray-800 break-words">{comment.text}</span>
                      </div>
                  ))}
                  {(!selectedPost.comments || selectedPost.comments.length === 0) && (
                      <p className="text-gray-400 text-xs italic">No comments yet.</p>
                  )}
              </div>
            </div>

            {/* Add Comment Form */}
            <div className="p-3 border-t bg-gray-50 shrink-0">
                <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        maxLength={31}
                        className="flex-1 rounded-full border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2"
                    />
                    <button
                        type="submit"
                        disabled={!commentText.trim() || isSubmittingComment}
                        className="p-2 text-indigo-600 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
                <div className="text-right">
                    <span className={`text-[10px] ${commentText.length >= 31 ? 'text-red-500' : 'text-gray-400'}`}>
                        {commentText.length}/31
                    </span>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageCarousel({ post }: { post: Post }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Construct list of all image URLs
    const imageUrls = [
        `/api/image/${post.id}.jpg`,
        ...(post.images || []).map(img => `/api/post_image/${img.id}.jpg`)
    ];

    const scrollTo = (index: number) => {
        if (!scrollContainerRef.current) return;
        const width = scrollContainerRef.current.clientWidth;
        scrollContainerRef.current.scrollTo({
            left: width * index,
            behavior: 'smooth'
        });
        setCurrentIndex(index);
    };

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const width = scrollContainerRef.current.clientWidth;
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const newIndex = Math.round(scrollLeft / width);
        if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
        }
    };

    return (
        <div className="w-full relative bg-gray-100 min-h-[200px] shrink-0 group">
             {/* Slider */}
            <div
                ref={scrollContainerRef}
                className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={handleScroll}
            >
                {imageUrls.map((url, idx) => (
                    <div key={idx} className="w-full flex-shrink-0 snap-center flex items-center justify-center h-auto max-h-[50vh]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url}
                            alt={`Slide ${idx}`}
                            className="w-full h-full object-contain max-h-[50vh]"
                        />
                    </div>
                ))}
            </div>

            {/* Navigation Arrows */}
            {imageUrls.length > 1 && (
                <>
                    {currentIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); scrollTo(currentIndex - 1); }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white rounded-full transition-opacity hover:bg-black/60 z-10"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    {currentIndex < imageUrls.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); scrollTo(currentIndex + 1); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white rounded-full transition-opacity hover:bg-black/60 z-10"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}
                </>
            )}

            {/* Dots Indicator */}
            {imageUrls.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {imageUrls.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
