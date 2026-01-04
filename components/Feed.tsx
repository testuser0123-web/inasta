'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, Plus, X, Trash2, BadgeCheck, Loader2, Share2, Send, User as UserIcon, Layers, AlertTriangle, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toggleLike, deletePost, fetchFeedPosts, fetchUserPosts, fetchLikedPosts } from '@/app/actions/post';
import { addComment } from '@/app/actions/comment';
import { fetchPostComments } from '@/app/actions/comment-fetch';
import { Spinner } from '@/components/ui/spinner';
import { RoleBadge } from '@/components/RoleBadge';
import { ImageCarousel } from '@/components/ImageCarousel';
import { ImageWithSpinner } from '@/components/ImageWithSpinner';

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

export default function Feed({ initialPosts, currentUserId, feedType, searchQuery, targetUserId }: { initialPosts: Post[], currentUserId: number, feedType?: 'all' | 'following' | 'search' | 'user_posts' | 'user_likes', searchQuery?: string, targetUserId?: number }) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 12);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const openedViaNav = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const postsRef = useRef(posts);
  postsRef.current = posts;

  // Guest check: if currentUserId is -1 (or undefined/null if upstream not handled, but we expect -1 from FeedContent)
  // Actually check for valid ID.
  const isGuest = currentUserId === -1 || !currentUserId;

  useEffect(() => {
    // Only reset posts if the feed context (type, query, user) changes.
    // This prevents revalidations (e.g. from addComment) from resetting the list to page 1
    // while the user has loaded more posts.
    setPosts(initialPosts);
    setHasMore(initialPosts.length >= 12);
  }, [feedType, searchQuery, targetUserId]);

  // Sync from URL on initial load and whenever posts data changes.
  // This handles deep links and ensures the modal opens correctly
  // even if the `posts` array is populated asynchronously after the first render.
  useEffect(() => {
    const postIdParam = searchParams.get('postId');
    if (postIdParam) {
        const id = parseInt(postIdParam, 10);
        if (!isNaN(id)) {
            // Only open if the post exists in the current feed list
            const postExists = posts.some(p => p.id === id);
            if (postExists) {
                setSelectedPostId(id);
                // Mark as opened via nav so back button works correctly if user refreshes then closes
                // Actually, if loaded from URL, popping back might leave the site or go to previous page.
                // We should let handleCloseModal assume it's NOT via nav (so it replaces state),
                // unless we manually push state here. But we don't want to push state on load.
                openedViaNav.current = false;
                return;
            }
        }
    }
  }, [posts]);

  // Handle browser back/forward buttons
  useEffect(() => {
      const handlePopState = () => {
          const params = new URLSearchParams(window.location.search);
          const postIdParam = params.get('postId');
          if (postIdParam) {
              const id = parseInt(postIdParam, 10);
              if (!isNaN(id) && postsRef.current.some(p => p.id === id)) {
                  setSelectedPostId(id);
              } else {
                  setSelectedPostId(null);
              }
          } else {
              setSelectedPostId(null);
          }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []); // No dependencies, runs only on mount

  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;

  useEffect(() => {
    if (!selectedPostId) return;

    const post = posts.find((p) => p.id === selectedPostId);
    if (post && post.comments === undefined) {
      fetchPostComments(post.id)
        .then((comments) => {
          setPosts((current) =>
            current.map((p) => (p.id === post.id ? { ...p, comments } : p))
          );
        })
        .catch((error) => {
          console.error('Failed to load comments', error);
          // In case of error, set empty comments to stop the spinner
          setPosts((current) =>
            current.map((p) => (p.id === post.id ? { ...p, comments: [] } : p))
          );
        });
    }
  }, [selectedPostId, posts]);

  const handlePostClick = async (post: Post) => {
    if (post.isSpoiler) {
      const confirmMessage = post.comment
        ? `${post.comment}\n\n本当に表示してもいいですか？`
        : "この投稿にはネタバレが含まれている可能性があります。本当に表示しますか？";

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    // Update state immediately
    setSelectedPostId(post.id);

    // Update URL without triggering navigation
    const params = new URLSearchParams(window.location.search);
    params.set('postId', post.id.toString());
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ postId: post.id }, '', newUrl);
    openedViaNav.current = true;
  };

  const handleCloseModal = () => {
      if (openedViaNav.current) {
          window.history.back();
          openedViaNav.current = false;
      } else {
          // If opened via deep link (refresh), replace state to remove query param
          const params = new URLSearchParams(window.location.search);
          params.delete('postId');
          const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
          window.history.replaceState(null, '', newUrl);
          setSelectedPostId(null);
      }
  };

  const handleLike = async (post: Post) => {
    if (isGuest) {
      alert("いいね機能を使用するにはログインが必要です。");
      return;
    }

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
    if (!confirm('この投稿を削除してもよろしいですか？')) return;
    
    setIsDeleting(true);
    await deletePost(postId);
    
    // Optimistic remove
    setPosts((current) => current.filter((p) => p.id !== postId));
    // Close modal if deleted
    if (selectedPostId === postId) {
        handleCloseModal();
    }
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
          setShareFeedback('リンクをコピーしました！');
          setTimeout(() => setShareFeedback(null), 2000);
      } catch (err) {
          console.error('Failed to copy', err);
          setShareFeedback('コピーに失敗しました');
      }
  };

  const handleAddComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isGuest) {
        alert("コメント機能を使用するにはログインが必要です。");
        return;
      }
      if (!selectedPost || !commentText.trim()) return;

      setIsSubmittingComment(true);

      const formData = new FormData();
      formData.append('postId', selectedPost.id.toString());
      formData.append('text', commentText);

      const result = await addComment(null, formData);

      if (result?.success) {
          setCommentText('');

          if (selectedPost && result.comment) {
             const newComment: Comment = {
                id: result.comment.id,
                text: result.comment.text,
                userId: result.comment.userId,
                user: {
                    username: result.comment.user.username,
                    avatarUrl: result.comment.user.avatarUrl
                }
             };

             setPosts(current => current.map(p => {
                 if (p.id === selectedPost.id) {
                     return {
                         ...p,
                         comments: [...(p.comments || []), newComment]
                     };
                 }
                 return p;
             }));
          }

          // Re-fetch data using router refresh instead of full reload to avoid client-side exceptions
          // No refresh needed as we update state locally to preserve scroll position/loaded posts
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
                  <span>もっと見る</span>
              </button>
          </div>
      )}

      {/* FAB - Only show if not guest */}
      {!isGuest && (
        <Link
            href="/upload"
            className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-20"
        >
            <Plus className="w-6 h-6" />
        </Link>
      )}

      {/* Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={handleCloseModal}>
          <div 
            className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden w-full max-w-sm relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
             <button 
                onClick={handleCloseModal}
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
                        className={`flex items-center gap-1.5 transition-colors group ${isGuest ? 'cursor-not-allowed opacity-50' : ''}`}
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
                                    <img
                                        src={selectedPost.user.avatarUrl}
                                        alt={selectedPost.user.username}
                                        className="w-full h-full object-cover"
                                        crossOrigin={selectedPost.user.avatarUrl.trim().startsWith('http') ? 'anonymous' : undefined}
                                    />
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

                {!isGuest && currentUserId === selectedPost.userId && (
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
                          <p className="text-gray-400 text-xs italic">コメントはまだありません。</p>
                      )}
                    </>
                  )}
              </div>
            </div>

            {/* Add Comment Form */}
            {!isGuest && (
            <div className="p-3 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0">
                <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="コメントを追加..."
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
            )}
            {isGuest && (
                <div className="p-3 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 text-center">
                    <p className="text-sm text-gray-500">
                        <Link href="/login" className="text-indigo-500 hover:underline">ログイン</Link>してコメントに参加
                    </p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
