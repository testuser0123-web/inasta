'use client';

import { useState, useEffect } from 'react';
import { Heart, Plus, X, Trash2, BadgeCheck, Loader2, Share2, Send, User as UserIcon, Layers, AlertTriangle, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toggleLike, deletePost, fetchFeedPosts, fetchUserPosts, fetchLikedPosts } from '@/app/actions/post';
import { addComment } from '@/app/actions/comment';
import { fetchPostComments } from '@/app/actions/comment-fetch';
import { Spinner } from '@/components/ui/spinner';
import { RoleBadge } from '@/components/RoleBadge';
import { ImageCarousel } from '@/components/ImageCarousel';

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
  imageUrl?: string; // Main image URL
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
  comments?: Comment[];
  hashtags?: { name: string }[];
  images?: { id: number; order: number; url?: string }[];
};

function ImageWithSpinner({ src, alt, className }: { src: string, alt: string, className?: string }) {
    const [loaded, setLoaded] = useState(false);

    return (
        <div className={`relative w-full h-full ${className}`}>
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                    <div className="scale-50">
                        <Spinner />
                    </div>
                </div>
            )}
            <Image
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 768px) 33vw, 25vw"
                className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(true)} // Hide spinner on error too
                unoptimized={src.startsWith('/api/') || src.startsWith('http')}
            />
        </div>
    );
}

export default function Feed({ initialPosts, currentUserId, feedType, searchQuery, targetUserId }: { initialPosts: Post[], currentUserId: number, feedType?: 'all' | 'following' | 'search' | 'user_posts' | 'user_likes', searchQuery?: string, targetUserId?: number }) {
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

  const handlePostClick = async (post: Post) => {
    if (post.isSpoiler) {
      const confirmMessage = post.comment
        ? `${post.comment}\n\n本当に表示してもいいですか？`
        : "この投稿にはネタバレが含まれている可能性があります。本当に表示しますか？";

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setSelectedPostId(post.id);

    // Fetch comments on demand if they are not already loaded
    // Note: We check if comments are undefined. Empty array is valid loaded state.
    if (post.comments === undefined) {
        try {
            const comments = await fetchPostComments(post.id);
            setPosts(current =>
                current.map(p =>
                    p.id === post.id ? { ...p, comments } : p
                )
            );
        } catch (error) {
            console.error("Failed to load comments", error);
        }
    }
  };

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
          let newPosts: Post[] = [];

          if (feedType === 'user_posts' && targetUserId) {
              newPosts = await fetchUserPosts({ userId: targetUserId, cursorId: lastPostId });
          } else if (feedType === 'user_likes' && targetUserId) {
              newPosts = await fetchLikedPosts({ userId: targetUserId, cursorId: lastPostId });
          } else if (feedType === 'all' || feedType === 'following' || feedType === 'search') {
              newPosts = await fetchFeedPosts({ cursorId: lastPostId, feedType, searchQuery });
          }

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
      // Use the Page URL
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
            onClick={() => handlePostClick(post)}
            className="aspect-square relative cursor-pointer bg-gray-100 dark:bg-gray-800 overflow-hidden"
          >
            {post.isSpoiler ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            ) : post.mediaType === "VIDEO" ? (
                <div className="w-full h-full relative">
                    <ImageWithSpinner
                        src={post.thumbnailUrl || post.imageUrl || `/api/image/${post.id}.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 z-10">
                        <Play className="w-5 h-5 text-white fill-white drop-shadow-md" />
                    </div>
                </div>
            ) : (
              <ImageWithSpinner
                src={post.imageUrl || `/api/image/${post.id}.jpg`}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
            {post.images && post.images.length > 0 && post.mediaType !== "VIDEO" && (
                <div className="absolute top-2 right-2 z-10">
                    <Layers className="w-5 h-5 text-white drop-shadow-md" />
                </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More Button - Only show if feedType is provided (Home feed) */}
      {feedType && hasMore && (
          <div className="flex justify-center p-6">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              >
                  {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  Load More
              </button>
          </div>
      )}

      {/* FAB */}
      <Link
        href="/upload"
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-20"
      >
        <Plus className="w-6 h-6" />
      </Link>

      {/* Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPostId(null)}>
          <div 
            className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden w-full max-w-sm relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
             <button 
                onClick={() => setSelectedPostId(null)}
                className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-white z-10 hover:bg-black/40"
             >
                <X className="w-5 h-5" />
             </button>

            {selectedPost.mediaType === "VIDEO" ? (
                <div className="aspect-square bg-black flex items-center justify-center">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                        src={selectedPost.imageUrl || `/api/image/${selectedPost.id}.jpg`}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                        loop
                        poster={selectedPost.thumbnailUrl || undefined}
                        crossOrigin="anonymous"
                    />
                </div>
            ) : (
                <ImageCarousel
                imageUrls={[
                    selectedPost.imageUrl || `/api/image/${selectedPost.id}.jpg`,
                    ...(selectedPost.images || []).map(img => img.url || `/api/post_image/${img.id}.jpg`)
                ]}
                />
            )}

            <div className="p-4 overflow-y-auto flex-1 dark:text-gray-100">
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
                                    : 'text-gray-700 dark:text-gray-300 group-hover:text-red-500'
                            }`} 
                        />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedPost.likesCount}</span>
                    </button>
                    {/* Share Button */}
                    <button
                        onClick={() => handleShare(selectedPost.id)}
                        className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white relative"
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
                             <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                                {selectedPost.user.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={selectedPost.user.avatarUrl} alt={selectedPost.user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-300">
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                )}
                             </div>
                             <Link href={`/users/${selectedPost.user.username}`} className="text-sm font-semibold hover:underline">
                                @{selectedPost.user.username}
                             </Link>
                             {selectedPost.user.isGold ? (
                               <BadgeCheck className="w-4 h-4 text-yellow-500 fill-yellow-500/10" />
                             ) : selectedPost.user.isVerified ? (
                               <BadgeCheck className="w-4 h-4 text-blue-500" />
                             ) : null}
                             {selectedPost.user.roles?.map(roleId => (
                                <div key={roleId} className="scale-75 origin-left flex item-center">
                                    <RoleBadge roleId={roleId} />
                                </div>
                             ))}
                        </div>
                    )}
                </div>

                {currentUserId === selectedPost.userId && (
                   <button
                    onClick={() => handleDelete(selectedPost.id)}
                    disabled={isDeleting}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 disabled:opacity-50"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                )}
              </div>
              
              {selectedPost.comment && (
                <p className="text-gray-900 dark:text-gray-100 break-words mb-2">{selectedPost.comment}</p>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {new Date(selectedPost.createdAt).toLocaleString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>

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
              <div className="space-y-3 border-t dark:border-gray-800 pt-3">
                  {selectedPost.comments === undefined ? (
                      <div className="flex justify-center p-4">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                      </div>
                  ) : (
                    <>
                      {selectedPost.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2 items-start text-sm">
                              <Link href={`/users/${comment.user.username}`} className="font-bold hover:underline shrink-0 text-gray-900 dark:text-gray-100">
                                  {comment.user.username}
                              </Link>
                              <span className="text-gray-800 dark:text-gray-200 break-words">{comment.text}</span>
                          </div>
                      ))}
                      {selectedPost.comments.length === 0 && (
                          <p className="text-gray-400 text-xs italic">No comments yet.</p>
                      )}
                    </>
                  )}
              </div>
            </div>

            {/* Add Comment Form */}
            <div className="p-3 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0">
                <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        maxLength={31}
                        className="flex-1 rounded-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2"
                    />
                    <button
                        type="submit"
                        disabled={!commentText.trim() || isSubmittingComment}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
