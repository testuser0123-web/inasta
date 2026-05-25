'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, Plus, X, Trash2, BadgeCheck, Loader2, Share2, Send, User as UserIcon, Layers, AlertTriangle, Play, CornerDownRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { toggleLike, toggleReaction, deletePost, fetchFeedPosts, fetchUserPosts, fetchLikedPosts } from '@/app/actions/post';
import { addComment, deleteComment } from '@/app/actions/comment';
import { RoleBadge } from '@/components/RoleBadge';
import { ImageCarousel } from '@/components/ImageCarousel';
import { ImageWithSpinner } from '@/components/ImageWithSpinner';
import { Linkify } from '@/components/Linkify';
import { EMOJI_REACTION_CATEGORIES, normalizeReactionKey, type CustomEmojiSummary, type PostReactionSummary } from '@/lib/reactions';
import { fetchCustomEmojis } from '@/app/actions/custom-emoji';

type Comment = {
  id: number;
  text: string;
  userId: number;
  user: {
      username: string;
      avatarUrl: string | null;
  };
};

const COMMENT_FETCH_TIMEOUT_MS = 10000;

async function fetchPostComments(postId: number, signal?: AbortSignal): Promise<Comment[]> {
  const response = await fetch(`/api/comments?postId=${postId}`, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.status}`);
  }

  return response.json();
}

function toReactionKey(emoji: string) {
  return normalizeReactionKey(emoji);
}

function reactionKeyToEmoji(reactionKey: string) {
  return reactionKey.startsWith('unicode:') ? reactionKey.slice('unicode:'.length) : reactionKey;
}

function getCustomEmojiImageSrc(customEmoji: CustomEmojiSummary) {
  return customEmoji.imageUrl ? `/api/custom_emoji/${customEmoji.id}.webp` : customEmoji.imageUrl;
}

function toggleReactionSummary(
  reactions: PostReactionSummary[] | undefined,
  reactionKey: string,
  customEmoji?: CustomEmojiSummary
): PostReactionSummary[] {
  const current = reactions ? [...reactions] : [];
  const index = current.findIndex((reaction) => reaction.reactionKey === reactionKey);

  if (index >= 0) {
    const existing = current[index];
    if (existing.hasReacted) {
      const nextCount = existing.count - 1;
      if (nextCount <= 0) {
        current.splice(index, 1);
      } else {
        current[index] = { ...existing, count: nextCount, hasReacted: false };
      }
    } else {
      current[index] = { ...existing, count: existing.count + 1, hasReacted: true };
    }
  } else {
    current.push({
      reactionKey,
      emoji: customEmoji ? `:${customEmoji.name}:` : reactionKeyToEmoji(reactionKey),
      count: 1,
      hasReacted: true,
      customEmoji,
    });
  }

  return current.sort((a, b) => b.count - a.count || a.reactionKey.localeCompare(b.reactionKey));
}

type Post = {
  id: number;
  imageUrl?: string; // Main image URL
  mediaType?: "IMAGE" | "VIDEO";
  thumbnailUrl?: string | null;
  frameColor?: string | null;
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
  reactions?: PostReactionSummary[];
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
  const [replyingTo, setReplyingTo] = useState<{ commentId: number; username: string } | null>(null);
  const [showReactionPickerForPostId, setShowReactionPickerForPostId] = useState<number | null>(null);
  const [customEmojis, setCustomEmojis] = useState<CustomEmojiSummary[]>([]);
  const [customEmojiError, setCustomEmojiError] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const getCommentTextDetails = (text: string) => {
    const replyPrefixRegex = /^@[^\s]+\s/;
    const match = text.match(replyPrefixRegex);
    if (match) {
      const prefix = match[0];
      const actualText = text.slice(prefix.length);
      return { prefix, actualText, actualLength: actualText.length, maxLengthWithPrefix: prefix.length + 31 };
    }
    return { prefix: '', actualText: text, actualLength: text.length, maxLengthWithPrefix: 31 };
  };

  const { actualText, actualLength, maxLengthWithPrefix } = getCommentTextDetails(commentText);

  const openedViaNav = useRef(false);
  const pendingOpenPostId = useRef<number | null>(null);
  const pendingClose = useRef(false);
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

  // Sync from URL on initial load and whenever posts data changes or searchParams change.
  // This handles deep links and App Router-driven URL updates. Read window.location
  // inside the effect so stale useSearchParams snapshots cannot close a just-opened modal.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search || searchParams.toString());
    const postIdParam = params.get('postId');
    if (postIdParam) {
        const id = parseInt(postIdParam, 10);
        if (!isNaN(id)) {
            // Ignore stale URL snapshots while a close navigation is still settling.
            if (pendingClose.current || (pendingOpenPostId.current !== null && pendingOpenPostId.current !== id)) {
                return;
            }

            // Only open if the post exists in the current feed list
            const postExists = posts.some(p => p.id === id);
            if (postExists) {
                pendingOpenPostId.current = null;
                pendingClose.current = false;
                setSelectedPostId(id);
                return;
            }
        }
    }

    pendingOpenPostId.current = null;
    pendingClose.current = false;
    openedViaNav.current = false;
    setSelectedPostId(null);
  }, [searchParams, posts]);

  // Browser/device back-forward navigation happens outside React event handlers.
  // Keep the modal state aligned with the real URL so a hardware back action
  // consumes the modal history entry instead of navigating away from the site.
  useEffect(() => {
      const handlePopState = () => {
          pendingOpenPostId.current = null;
          pendingClose.current = false;

          const params = new URLSearchParams(window.location.search);
          const postIdParam = params.get('postId');
          if (postIdParam) {
              const id = parseInt(postIdParam, 10);
              if (!isNaN(id) && postsRef.current.some(p => p.id === id)) {
                  setSelectedPostId(id);
                  return;
              }
          }

          openedViaNav.current = false;
          setSelectedPostId(null);
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;
  const reactionPickerPost = showReactionPickerForPostId ? posts.find((p) => p.id === showReactionPickerForPostId) : null;

  useEffect(() => {
    if (!showReactionPickerForPostId || isGuest) return;
    let cancelled = false;
    fetchCustomEmojis()
      .then((emojis) => {
        if (!cancelled) setCustomEmojis(emojis);
      })
      .catch(() => {
        if (!cancelled) setCustomEmojiError('カスタム絵文字を読み込めませんでした。');
      });
    return () => { cancelled = true; };
  }, [showReactionPickerForPostId, isGuest]);

  useEffect(() => {
    if (!selectedPostId) return;

    const post = posts.find((p) => p.id === selectedPostId);
    if (!post || post.comments !== undefined) return;

    let isActive = true;
    let didTimeout = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, COMMENT_FETCH_TIMEOUT_MS);

    fetchPostComments(post.id, controller.signal)
      .then((comments) => {
        if (!isActive) return;
        setPosts((current) =>
          current.map((p) => (p.id === post.id ? { ...p, comments } : p))
        );
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Failed to load comments', error);
        // In case of error or timeout, set empty comments to stop the spinner.
        setPosts((current) =>
          current.map((p) => (p.id === post.id ? { ...p, comments: [] } : p))
        );
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      isActive = false;
      if (!didTimeout) {
        controller.abort();
      }
      window.clearTimeout(timeoutId);
    };
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

    // Reserve the modal history entry synchronously before showing the modal.
    // This makes hardware/browser back immediately close the modal instead of
    // consuming the previous page entry while App Router navigation is settling.
    pendingClose.current = false;
    pendingOpenPostId.current = post.id;

    const params = new URLSearchParams(window.location.search || searchParams.toString());
    params.set('postId', post.id.toString());
    const newUrl = `${pathname}?${params.toString()}`;
    window.history.pushState({ postId: post.id }, '', newUrl);
    openedViaNav.current = true;
    setSelectedPostId(post.id);
  };

  const handleCloseModal = () => {
      pendingClose.current = true;
      pendingOpenPostId.current = null;
      setSelectedPostId(null);

      if (openedViaNav.current) {
          openedViaNav.current = false;
          window.history.back();
      } else {
          // If opened via deep link (refresh), replace state to remove query param
          const params = new URLSearchParams(window.location.search || searchParams.toString());
          params.delete('postId');
          const newUrl = `${pathname}${params.toString() ? '?' + params.toString() : ''}`;
          window.history.replaceState(null, '', newUrl);
      }
  };

  const handleReaction = async (post: Post, emojiOrReactionKey?: string, customEmoji?: CustomEmojiSummary) => {
    if (isGuest) {
      alert("リアクション機能を使用するにはログインが必要です。");
      return;
    }

    if (!emojiOrReactionKey) {
      setShowReactionPickerForPostId((current) => (current === post.id ? null : post.id));
      return;
    }

    let reactionKey: string;
    try {
      reactionKey = toReactionKey(emojiOrReactionKey);
    } catch {
      alert('リアクションには絵文字1つだけを選択してください。');
      return;
    }
    setShowReactionPickerForPostId(null);
    setPosts((current) =>
      current.map((p) =>
        p.id === post.id
          ? { ...p, reactions: toggleReactionSummary(p.reactions, reactionKey, customEmoji) }
          : p
      )
    );

    await toggleReaction(post.id, reactionKey);
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
      if (!selectedPost || !actualText.trim()) return;

      setIsSubmittingComment(true);

      const formData = new FormData();
      formData.append('postId', selectedPost.id.toString());
      formData.append('text', commentText);
      if (replyingTo) {
          formData.append('replyToCommentId', replyingTo.commentId.toString());
      }

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
      setReplyingTo(null);
  };

  const handleReplyClick = (commentId: number, username: string) => {
      setReplyingTo({ commentId, username });
      const replyPrefix = `@${username} `;
      setCommentText(replyPrefix);
      setTimeout(() => {
          if (commentInputRef.current) {
              commentInputRef.current.focus();
          }
      }, 0);
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('本当にこのコメントを削除しますか？')) return;

    // Optimistic update
    if (selectedPost) {
        setPosts(current => current.map(p => {
            if (p.id === selectedPost.id) {
                return {
                    ...p,
                    comments: p.comments?.filter(c => c.id !== commentId)
                };
            }
            return p;
        }));
    }

    const result = await deleteComment(commentId);
    if (!result.success) {
        alert(result.message || 'コメントの削除に失敗しました');
        // Rollback would be complex here without keeping previous state,
        // but for now we rely on revalidation or user refresh if it failed.
        // Ideally we should refetch comments or revert the optimistic update.
        if (selectedPost) {
             const rollbackPostId = selectedPost.id;
             const controller = new AbortController();
             const timeoutId = window.setTimeout(() => {
                controller.abort();
             }, COMMENT_FETCH_TIMEOUT_MS);

             fetchPostComments(rollbackPostId, controller.signal)
                .then(comments => {
                    setPosts(current => current.map(p => {
                        if (p.id === rollbackPostId) {
                            return { ...p, comments };
                        }
                        return p;
                    }));
                })
                .catch(error => {
                    console.error('Failed to reload comments after delete rollback', error);
                })
                .finally(() => {
                    window.clearTimeout(timeoutId);
                });
        }
    }
  };

  return (
    <div className="pb-20">
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => handlePostClick(post)}
            className="aspect-square relative cursor-pointer bg-gray-100 dark:bg-gray-800 overflow-hidden"
            style={{
              border: post.frameColor ? `4px solid ${post.frameColor}` : undefined,
              boxSizing: 'border-box'
            }}
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
                <div className="w-full h-[min(100vw,24rem)] max-h-[min(60vh,24rem)] shrink-0 bg-black flex items-center justify-center overflow-hidden">
                    <video
                        src={selectedPost.imageUrl || `/api/image/${selectedPost.id}.jpg`}
                        className="max-w-full max-h-full object-contain"
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

            <div className="p-4 overflow-y-auto flex-1 min-h-0 dark:text-gray-100">
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
                <p className="text-gray-900 dark:text-gray-100 break-words mb-2">
                    <Linkify>{selectedPost.comment}</Linkify>
                </p>
              )}

              {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
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




              {/* Comments Section */}
              <div className="space-y-3 border-t dark:border-gray-800 pt-3">
                <div className="flex flex-wrap items-center gap-1 pb-3 border-b border-gray-100 dark:border-gray-800" data-emoji-picker="unicode-emoji-grid">
                {(selectedPost.reactions || []).map((reaction) => (
                  <button
                    key={reaction.reactionKey}
                    type="button"
                    onClick={() => handleReaction(selectedPost, reaction.reactionKey)}
                    className={`px-2 py-1 rounded-full border text-sm transition-colors ${reaction.hasReacted ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-200' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title="リアクションを切り替え"
                  >
                    {reaction.customEmoji ? (
                      <img src={getCustomEmojiImageSrc(reaction.customEmoji)} alt={`:${reaction.customEmoji.name}:`} width={24} height={24} className="mr-1 inline-block h-6 w-6 rounded-sm object-contain align-middle" />
                    ) : (
                      <span className="mr-1">{reaction.emoji}</span>
                    )}
                    <span className="text-xs font-semibold">{reaction.count}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleReaction(selectedPost)}
                  className={`px-2 py-1 rounded-full border text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="絵文字一覧から追加"
                  aria-expanded={showReactionPickerForPostId === selectedPost.id}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
                  {selectedPost.comments === undefined ? (
                      <div className="flex justify-center p-4">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                      </div>
                  ) : (
                    <>
                      {selectedPost.comments.map((comment) => (
                          <div key={comment.id} className="text-sm flex items-start justify-between group">
                              <div>
                                <Link href={`/users/${comment.user.username}`} className="font-bold hover:underline mr-2 text-gray-900 dark:text-gray-100">
                                    {comment.user.username}
                                </Link>
                                <span className="text-gray-800 dark:text-gray-200 break-words">
                                    <Linkify>{comment.text}</Linkify>
                                </span>
                              </div>
                                      <div className="flex items-center space-x-2">
                                          {comment.userId !== currentUserId && (
                                              <button
                                                  onClick={() => handleReplyClick(comment.id, comment.user.username)}
                                                  className="transition-opacity p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                  title="返信する"
                                              >
                                                  <CornerDownRight className="w-4 h-4" />
                                              </button>
                                          )}
                                          {comment.userId === currentUserId && (
                                              <button
                                                  onClick={() => handleDeleteComment(comment.id)}
                                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                      aria-label="Delete comment"
                                  >
                                      <Trash2 className="w-3 h-3" />
                                              </button>
                                          )}
                                      </div>
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
              <div className="p-4 border-t dark:border-gray-800 shrink-0 flex flex-col">
                {replyingTo && (
                    <div className="flex justify-between items-center text-xs text-indigo-500 mb-2">
                        <span>@{replyingTo.username} に返信中...</span>
                        <button type="button" onClick={() => {
                            setReplyingTo(null);
                            setCommentText('');
                        }} className="text-gray-500 hover:text-gray-700">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                    ref={commentInputRef}
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="コメントを追加..."
                        maxLength={maxLengthWithPrefix}
                        className="flex-1 rounded-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2"
                    />
                    <button
                        type="submit"
                        disabled={!actualText.trim() || isSubmittingComment}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
                <div className="text-right">
                    <span className={`text-[10px] ${actualLength >= 31 ? 'text-red-500' : 'text-gray-400'}`}>
                        {actualLength}/31
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

      {reactionPickerPost && !isGuest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="絵文字リアクションを選択">
          <div data-emoji-picker-panel className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">リアクションを選択</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">絵文字1つだけ追加できます</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReactionPickerForPostId(null)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="絵文字一覧を閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3">
              <section className="mb-5 p-1">
                <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Custom Emojis</h3>
                {customEmojis.length > 0 && (
                  <div className="mb-3 grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
                    {customEmojis.map((customEmoji) => (
                      <button
                        key={customEmoji.id}
                        type="button"
                        onClick={() => handleReaction(reactionPickerPost, `custom:${customEmoji.id}`, customEmoji)}
                        className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={`:${customEmoji.name}: を追加`}
                      >
                        <img src={getCustomEmojiImageSrc(customEmoji)} alt={`:${customEmoji.name}:`} width={32} height={32} className="h-8 w-8 object-contain" />
                      </button>
                    ))}
                  </div>
                )}
                {customEmojiError && <p className="mt-2 text-xs text-red-500">{customEmojiError}</p>}
              </section>
              {EMOJI_REACTION_CATEGORIES.map((category) => (
                <section key={category.label} className="mb-4 last:mb-0">
                  <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {category.label}
                  </h3>
                  <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
                    {category.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReaction(reactionPickerPost, emoji)}
                        className="rounded-lg p-2 text-2xl hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={`${emoji} を追加`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
