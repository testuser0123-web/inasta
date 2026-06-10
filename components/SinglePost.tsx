'use client';

import { useState, useEffect, useRef, type FormEvent, type MouseEvent, type PointerEvent } from 'react';
import { Heart, Trash2, BadgeCheck, Loader2, Share2, Send, User as UserIcon, AlertTriangle, CornerDownRight, X, Plus, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toggleLike, toggleReaction, deletePost, updatePostComment } from '@/app/actions/post';
import { addComment, deleteComment } from '@/app/actions/comment';
import { RoleBadge } from '@/components/RoleBadge';
import { ImageCarousel } from '@/components/ImageCarousel';
import { Linkify } from '@/components/Linkify';
import { EMOJI_REACTION_CATEGORIES, normalizeReactionKey, type CustomEmojiSummary, type PostReactionSummary } from '@/lib/reactions';
import { fetchCustomEmojis } from '@/app/actions/custom-emoji';

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
      if (nextCount <= 0) current.splice(index, 1);
      else current[index] = { ...existing, count: nextCount, hasReacted: false };
    } else {
      current[index] = { ...existing, count: existing.count + 1, hasReacted: true };
    }
  } else {
    current.push({ reactionKey, emoji: customEmoji ? `:${customEmoji.name}:` : reactionKeyToEmoji(reactionKey), count: 1, hasReacted: true, customEmoji, users: [] });
  }

  return current.sort((a, b) => b.count - a.count || a.reactionKey.localeCompare(b.reactionKey));
}

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
  imageUrl?: string; // Main image URL (or Video URL)
  mediaType: 'IMAGE' | 'VIDEO';
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
  reactions?: PostReactionSummary[];
  hashtags?: { name: string }[];
  images?: { id: number; order: number; url?: string }[];
};

export default function SinglePost({ initialPost, currentUserId }: { initialPost: Post, currentUserId: number }) {
  const [post, setPost] = useState(initialPost);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(!initialPost.isSpoiler);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: number; username: string } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [customEmojis, setCustomEmojis] = useState<CustomEmojiSummary[]>([]);
  const [customEmojiError, setCustomEmojiError] = useState<string | null>(null);
  const [previewReaction, setPreviewReaction] = useState<PostReactionSummary | null>(null);
  const [enlargedCustomEmoji, setEnlargedCustomEmoji] = useState<CustomEmojiSummary | null>(null);
  const [isEditingPostComment, setIsEditingPostComment] = useState(false);
  const [editCommentText, setEditCommentText] = useState(initialPost.comment ?? '');
  const [isSavingPostComment, setIsSavingPostComment] = useState(false);
  const [reactionViewer, setReactionViewer] = useState<PostReactionSummary | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const reactionPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionPreviewDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customEmojiPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customEmojiPreviewDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressReactionClickRef = useRef(false);
  const suppressCustomEmojiClickRef = useRef(false);

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

  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep local optimistic state aligned after router.refresh() supplies a new post payload.
    setPost(initialPost);
    setEditCommentText(initialPost.comment ?? '');
    setIsEditingPostComment(false);
  }, [initialPost]);

  const isGuest = currentUserId === -1 || !currentUserId;

  useEffect(() => {
    if (!showReactionPicker || isGuest) return;
    let cancelled = false;
    fetchCustomEmojis()
      .then((emojis) => {
        if (!cancelled) setCustomEmojis(emojis);
      })
      .catch(() => {
        if (!cancelled) setCustomEmojiError('カスタム絵文字を読み込めませんでした。');
      });
    return () => { cancelled = true; };
  }, [showReactionPicker, isGuest]);

  const handleReaction = async (emojiOrReactionKey?: string, customEmoji?: CustomEmojiSummary) => {
    if (isGuest) {
      alert("リアクション機能を使用するにはログインが必要です。");
      return;
    }

    if (!emojiOrReactionKey) {
      setShowReactionPicker((current) => !current);
      return;
    }

    let reactionKey: string;
    try {
      reactionKey = toReactionKey(emojiOrReactionKey);
    } catch {
      alert('リアクションには絵文字1つだけを選択してください。');
      return;
    }
    clearReactionPreviewTimers();
    clearCustomEmojiPreviewTimers();
    setPreviewReaction(null);
    setEnlargedCustomEmoji(null);
    setShowReactionPicker(false);
    setPost((current) => ({
      ...current,
      reactions: toggleReactionSummary(current.reactions, reactionKey, customEmoji),
    }));

    await toggleReaction(post.id, reactionKey);
  };

  const clearReactionPreviewTimers = () => {
    if (reactionPreviewTimerRef.current) {
      clearTimeout(reactionPreviewTimerRef.current);
      reactionPreviewTimerRef.current = null;
    }
    if (reactionPreviewDismissTimerRef.current) {
      clearTimeout(reactionPreviewDismissTimerRef.current);
      reactionPreviewDismissTimerRef.current = null;
    }
  };

  const clearCustomEmojiPreviewTimers = () => {
    if (customEmojiPreviewTimerRef.current) {
      clearTimeout(customEmojiPreviewTimerRef.current);
      customEmojiPreviewTimerRef.current = null;
    }
    if (customEmojiPreviewDismissTimerRef.current) {
      clearTimeout(customEmojiPreviewDismissTimerRef.current);
      customEmojiPreviewDismissTimerRef.current = null;
    }
  };

  const canHoverPreview = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const showReactionPreview = (reaction: PostReactionSummary) => {
    clearReactionPreviewTimers();
    setPreviewReaction(reaction);
  };

  const showCustomEmojiPreview = (customEmoji: CustomEmojiSummary) => {
    clearCustomEmojiPreviewTimers();
    setEnlargedCustomEmoji(customEmoji);
  };

  const scheduleReactionPreviewHide = (delay = 0) => {
    if (reactionPreviewDismissTimerRef.current) {
      clearTimeout(reactionPreviewDismissTimerRef.current);
    }
    reactionPreviewDismissTimerRef.current = setTimeout(() => {
      setPreviewReaction(null);
      reactionPreviewDismissTimerRef.current = null;
    }, delay);
  };

  const scheduleCustomEmojiPreviewHide = (delay = 0) => {
    if (customEmojiPreviewDismissTimerRef.current) {
      clearTimeout(customEmojiPreviewDismissTimerRef.current);
    }
    customEmojiPreviewDismissTimerRef.current = setTimeout(() => {
      setEnlargedCustomEmoji(null);
      customEmojiPreviewDismissTimerRef.current = null;
    }, delay);
  };

  const handleReactionMouseEnter = (reaction: PostReactionSummary) => {
    if (canHoverPreview()) showReactionPreview(reaction);
  };

  const handleReactionMouseLeave = () => {
    if (canHoverPreview()) scheduleReactionPreviewHide(80);
  };

  const handleCustomEmojiMouseEnter = (customEmoji: CustomEmojiSummary) => {
    if (canHoverPreview()) showCustomEmojiPreview(customEmoji);
  };

  const handleCustomEmojiMouseLeave = () => {
    if (canHoverPreview()) scheduleCustomEmojiPreviewHide(80);
  };

  const handleReactionPointerDown = (event: PointerEvent<HTMLButtonElement>, reaction: PostReactionSummary) => {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();
    clearReactionPreviewTimers();
    suppressReactionClickRef.current = false;
    reactionPreviewTimerRef.current = setTimeout(() => {
      suppressReactionClickRef.current = true;
      setPreviewReaction(reaction);
    }, 450);
  };

  const handleCustomEmojiPointerDown = (event: PointerEvent<HTMLButtonElement>, customEmoji: CustomEmojiSummary) => {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();
    clearCustomEmojiPreviewTimers();
    suppressCustomEmojiClickRef.current = false;
    customEmojiPreviewTimerRef.current = setTimeout(() => {
      suppressCustomEmojiClickRef.current = true;
      setEnlargedCustomEmoji(customEmoji);
    }, 450);
  };

  const handleReactionPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') return;
    if (reactionPreviewTimerRef.current) {
      clearTimeout(reactionPreviewTimerRef.current);
      reactionPreviewTimerRef.current = null;
    }
    if (suppressReactionClickRef.current) scheduleReactionPreviewHide(900);
  };

  const handleCustomEmojiPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') return;
    if (customEmojiPreviewTimerRef.current) {
      clearTimeout(customEmojiPreviewTimerRef.current);
      customEmojiPreviewTimerRef.current = null;
    }
    if (suppressCustomEmojiClickRef.current) scheduleCustomEmojiPreviewHide(900);
  };

  const handleReactionPointerCancel = () => {
    clearReactionPreviewTimers();
    setPreviewReaction(null);
    suppressReactionClickRef.current = false;
  };

  const handleCustomEmojiPointerCancel = () => {
    clearCustomEmojiPreviewTimers();
    setEnlargedCustomEmoji(null);
    suppressCustomEmojiClickRef.current = false;
  };

  const handleReactionChipClick = (event: MouseEvent<HTMLButtonElement>, reactionKey: string) => {
    if (suppressReactionClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressReactionClickRef.current = false;
      return;
    }
    clearReactionPreviewTimers();
    setPreviewReaction(null);
    handleReaction(reactionKey);
  };

  const handleCustomEmojiPickerClick = (event: MouseEvent<HTMLButtonElement>, customEmoji: CustomEmojiSummary) => {
    if (suppressCustomEmojiClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressCustomEmojiClickRef.current = false;
      return;
    }
    clearCustomEmojiPreviewTimers();
    setEnlargedCustomEmoji(null);
    handleReaction(`custom:${customEmoji.id}`, customEmoji);
  };

  useEffect(() => {
    return () => {
      if (reactionPreviewTimerRef.current) clearTimeout(reactionPreviewTimerRef.current);
      if (reactionPreviewDismissTimerRef.current) clearTimeout(reactionPreviewDismissTimerRef.current);
      if (customEmojiPreviewTimerRef.current) clearTimeout(customEmojiPreviewTimerRef.current);
      if (customEmojiPreviewDismissTimerRef.current) clearTimeout(customEmojiPreviewDismissTimerRef.current);
    };
  }, []);


  const handleLike = async () => {
    // Optimistic update
    setPost((current) => ({
        ...current,
        likesCount: current.hasLiked ? current.likesCount - 1 : current.likesCount + 1,
        hasLiked: !current.hasLiked
    }));

    await toggleLike(post.id);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setIsDeleting(true);
    await deletePost(post.id);
    router.push('/');
  };

  const startEditingPostComment = () => {
    setEditCommentText(post.comment ?? '');
    setIsEditingPostComment(true);
  };

  const cancelEditingPostComment = () => {
    setEditCommentText(post.comment ?? '');
    setIsEditingPostComment(false);
  };

  const handleSavePostComment = async () => {
    if (editCommentText.trim().length > 173) {
      alert('コメントが長すぎます(173文字まで)');
      return;
    }

    setIsSavingPostComment(true);
    const result = await updatePostComment(post.id, editCommentText);
    setIsSavingPostComment(false);

    if (result?.success) {
      setPost((current) => ({ ...current, comment: result.comment }));
      setIsEditingPostComment(false);
    } else {
      alert(result?.message || '投稿の編集に失敗しました');
    }
  };

  const handleShare = async () => {
      // Use the actual post URL instead of just the image API URL
      const url = `${window.location.origin}/p/${post.id}`;
      try {
          await navigator.clipboard.writeText(url);
          setShareFeedback('Link copied!');
          setTimeout(() => setShareFeedback(null), 2000);
      } catch (err) {
          console.error('Failed to copy', err);
          setShareFeedback('Failed to copy');
      }
  };

  const handleAddComment = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!actualText.trim()) return;

      setIsSubmittingComment(true);

      const formData = new FormData();
      formData.append('postId', post.id.toString());
      formData.append('text', commentText);
      if (replyingTo) {
          formData.append('replyToCommentId', replyingTo.commentId.toString());
      }

      const result = await addComment(null, formData);

      if (result?.success) {
          setCommentText('');
          router.refresh(); // Refresh to get the new comment from server
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

      const result = await deleteComment(commentId);
      if (result.success) {
          router.refresh();
      } else {
          alert(result.message || 'Failed to delete comment');
      }
  };

  const handleSpoilerReveal = () => {
    const confirmMessage = post.comment
      ? `${post.comment}\n\n本当に表示してもいいですか？`
      : "この投稿にはネタバレが含まれている可能性があります。本当に表示しますか？";

    if (window.confirm(confirmMessage)) {
      setShowSpoiler(true);
    }
  };

  if (!showSpoiler && post.isSpoiler) {
      return (
          <div className="w-full max-w-lg mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg aspect-square flex items-center justify-center cursor-pointer" onClick={handleSpoilerReveal}>
             <div className="flex flex-col items-center gap-4 p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
                <p className="font-bold text-gray-700 dark:text-gray-300">Spoiler Alert</p>
                <button className="px-4 py-2 bg-white dark:bg-gray-700 rounded-md shadow text-sm">
                    Click to reveal
                </button>
             </div>
          </div>
      );
  }

  return (
    <>
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 overflow-hidden w-full max-w-lg mx-auto flex flex-col">
       {post.mediaType === 'VIDEO' ? (
         <div className="w-full relative bg-black aspect-video flex items-center justify-center">
           <video
             src={post.imageUrl || `/api/image/${post.id}.jpg`}
             poster={post.thumbnailUrl || undefined}
             controls
             playsInline
             className="w-full h-full object-contain"
             preload="metadata"
             crossOrigin="anonymous"
           />
         </div>
       ) : (
         <ImageCarousel
            imageUrls={[
                post.imageUrl || `/api/image/${post.id}.jpg`,
                ...(post.images || []).map(img => img.url || `/api/post_image/${img.id}.jpg`)
            ]}
         />
       )}

       <div className="p-4">
         <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
           <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
               <button
                   onClick={handleLike}
                   className="flex items-center gap-1.5 transition-colors group"
               >
                   <Heart
                       className={`w-6 h-6 transition-colors ${
                           post.hasLiked
                               ? 'fill-red-500 text-red-500'
                               : 'text-gray-700 dark:text-gray-300 group-hover:text-red-500'
                       }`}
                   />
                   <span className="font-semibold text-gray-700 dark:text-gray-300">{post.likesCount}</span>
               </button>
               {/* Share Button */}
               <button
                   onClick={handleShare}
                   className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white relative"
               >
                   <Share2 className="w-6 h-6" />
                   {shareFeedback && (
                       <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                           {shareFeedback}
                       </span>
                   )}
               </button>

               {/* User Info */}
               {post.user && (
                   <div className="ml-0 flex min-w-0 flex-wrap items-center gap-2 sm:ml-2">
                        <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                           {post.user.avatarUrl ? (
                               // eslint-disable-next-line @next/next/no-img-element
                               <img
                                 src={post.user.avatarUrl}
                                 alt={post.user.username}
                                 className="w-full h-full object-cover"
                                 crossOrigin={post.user.avatarUrl.startsWith('http') ? 'anonymous' : undefined}
                               />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-300">
                                   <UserIcon className="w-4 h-4" />
                               </div>
                           )}
                        </div>
                        <Link href={`/users/${post.user.username}`} className="min-w-0 max-w-[10rem] truncate text-sm font-semibold hover:underline sm:max-w-none">
                           @{post.user.username}
                        </Link>
                        {post.user.isGold ? (
                          <BadgeCheck className="w-4 h-4 text-yellow-500 fill-yellow-500/10" />
                        ) : post.user.isVerified ? (
                          <BadgeCheck className="w-4 h-4 text-blue-500" />
                        ) : null}
                        {post.user.roles?.map(roleId => (
                           <div key={roleId} className="flex origin-left scale-75 items-center">
                               <RoleBadge roleId={roleId} />
                           </div>
                        ))}
                   </div>
               )}
           </div>

           {currentUserId === post.userId && (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                 type="button"
                 onClick={startEditingPostComment}
                 disabled={isDeleting || isSavingPostComment}
                 className="text-gray-400 dark:text-gray-500 hover:text-indigo-500 disabled:opacity-50"
                 aria-label="投稿本文を編集"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                 type="button"
                 onClick={handleDelete}
                 disabled={isDeleting}
                 className="text-gray-400 dark:text-gray-500 hover:text-red-500 disabled:opacity-50"
                 aria-label="投稿を削除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
           )}
         </div>

         {isEditingPostComment ? (
           <div className="mb-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
             <textarea
               value={editCommentText}
               onChange={(event) => setEditCommentText(event.target.value)}
               maxLength={173}
               rows={4}
               className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
               placeholder="本文を入力"
             />
             <div className="mt-2 flex items-center justify-between">
               <span className={`text-[10px] ${editCommentText.trim().length >= 173 ? 'text-red-500' : 'text-gray-400'}`}>
                 {editCommentText.trim().length}/173
               </span>
               <div className="flex gap-2">
                 <button
                   type="button"
                   onClick={cancelEditingPostComment}
                   disabled={isSavingPostComment}
                   className="rounded-full px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
                 >
                   キャンセル
                 </button>
                 <button
                   type="button"
                   onClick={handleSavePostComment}
                   disabled={isSavingPostComment || editCommentText.trim().length > 173}
                   className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                 >
                   {isSavingPostComment ? '保存中...' : '保存'}
                 </button>
               </div>
             </div>
           </div>
         ) : post.comment ? (
           <p className="text-gray-900 dark:text-gray-100 break-words mb-2">
             <Linkify>{post.comment}</Linkify>
           </p>
         ) : null}

         {post.hashtags && post.hashtags.length > 0 && (
           <div className="flex flex-wrap gap-1 mb-2">
             {post.hashtags.map((tag) => (
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
           {new Date(post.createdAt).toLocaleString('ja-JP', {
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
           {(post.reactions || []).map((reaction) => (
             <div
               key={reaction.reactionKey}
               className={`inline-flex overflow-hidden rounded-full border text-sm transition-colors ${reaction.hasReacted ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-200' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200'}`}
             >
               <button
                 type="button"
                 onClick={(event) => handleReactionChipClick(event, reaction.reactionKey)}
                 onMouseEnter={() => reaction.customEmoji && handleReactionMouseEnter(reaction)}
                 onMouseLeave={reaction.customEmoji ? handleReactionMouseLeave : undefined}
                 onPointerDown={(event) => {
                   if (reaction.customEmoji) handleReactionPointerDown(event, reaction);
                 }}
                 onPointerUp={reaction.customEmoji ? handleReactionPointerUp : undefined}
                 onPointerCancel={reaction.customEmoji ? handleReactionPointerCancel : undefined}
                 onPointerLeave={(event) => {
                   if (event.pointerType !== 'mouse' && reaction.customEmoji) handleReactionPointerCancel();
                 }}
                 onContextMenu={(event) => {
                   if (reaction.customEmoji) event.preventDefault();
                 }}
                 className={`select-none py-1 pl-2 pr-1 transition-colors [-webkit-touch-callout:none] ${reaction.hasReacted ? 'hover:bg-indigo-100 dark:hover:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                 aria-label={reaction.customEmoji ? `:${reaction.customEmoji.name}: のリアクションを切り替え` : `${reaction.emoji} のリアクションを切り替え`}
               >
                 {reaction.customEmoji ? (
                   <img src={getCustomEmojiImageSrc(reaction.customEmoji)} alt={`:${reaction.customEmoji.name}:`} width={24} height={24} draggable={false} className="inline-block h-6 w-6 select-none rounded-sm object-contain align-middle [-webkit-touch-callout:none]" />
                 ) : (
                   <span>{reaction.emoji}</span>
                 )}
               </button>
               <button
                 type="button"
                 onClick={() => setReactionViewer(reaction)}
                 className={`border-l border-gray-300 py-1 pl-2 pr-2 text-xs font-semibold transition-colors dark:border-gray-600 ${reaction.hasReacted ? 'hover:bg-indigo-100 dark:hover:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                 aria-label={`${reaction.count}人のリアクションを表示`}
               >
                 {reaction.count}
               </button>
             </div>
           ))}
           <button
             type="button"
             onClick={() => handleReaction()}
             className={`px-2 py-1 rounded-full border text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
             title="絵文字一覧から追加"
             aria-expanded={showReactionPicker}
           >
             <Plus className="w-4 h-4" />
           </button>
         </div>
             {post.comments === undefined ? (
                 <div className="flex justify-center p-4">
                     <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                 </div>
             ) : (
               <>
                 {post.comments.map((comment) => (
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
                             {currentUserId === comment.userId && (
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
                 {post.comments.length === 0 && (
                     <p className="text-gray-400 text-xs italic">No comments yet.</p>
                 )}
               </>
             )}
         </div>
       </div>

       {/* Add Comment Form */}
       <div className="p-3 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 flex flex-col">
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
                   placeholder="Add a comment..."
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
    </div>

    {reactionViewer && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="リアクションしたユーザー">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {reactionViewer.customEmoji ? (
                <img src={getCustomEmojiImageSrc(reactionViewer.customEmoji)} alt={`:${reactionViewer.customEmoji.name}:`} width={24} height={24} className="h-6 w-6 rounded-sm object-contain" />
              ) : (
                <span className="text-xl">{reactionViewer.emoji}</span>
              )}
              <span>{reactionViewer.count}人</span>
            </div>
            <button
              type="button"
              onClick={() => setReactionViewer(null)}
              className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="閉じる"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {reactionViewer.users.map((user) => (
              <Link
                key={user.id}
                href={`/users/${user.username}`}
                onClick={() => setReactionViewer(null)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-500 dark:text-gray-300">
                      <UserIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">@{user.username}</span>
              </Link>
            ))}
            {reactionViewer.users.length < reactionViewer.count && (
              <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                ほか{reactionViewer.count - reactionViewer.users.length}人
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {previewReaction?.customEmoji && (
      <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-4" aria-hidden="true">
        <div className="flex max-w-[90vw] items-center justify-center rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur dark:border-gray-700/70 dark:bg-gray-900/95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCustomEmojiImageSrc(previewReaction.customEmoji)}
            alt={`:${previewReaction.customEmoji.name}:`}
            width={192}
            height={192}
            draggable={false}
            className="h-48 w-48 select-none rounded-xl object-contain [-webkit-touch-callout:none]"
          />
        </div>
      </div>
    )}

    {enlargedCustomEmoji && (
      <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center p-4" aria-hidden="true">
        <div className="flex max-w-[90vw] items-center justify-center rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur dark:border-gray-700/70 dark:bg-gray-900/95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCustomEmojiImageSrc(enlargedCustomEmoji)}
            alt={`:${enlargedCustomEmoji.name}:`}
            width={192}
            height={192}
            draggable={false}
            className="h-48 w-48 select-none rounded-xl object-contain [-webkit-touch-callout:none]"
          />
        </div>
      </div>
    )}

    {showReactionPicker && !isGuest && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="絵文字リアクションを選択">
        <div data-emoji-picker-panel className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">リアクションを選択</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">絵文字1つだけ追加できます</p>
            </div>
            <button
              type="button"
              onClick={() => setShowReactionPicker(false)}
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
                      onClick={(event) => handleCustomEmojiPickerClick(event, customEmoji)}
                      onMouseEnter={() => handleCustomEmojiMouseEnter(customEmoji)}
                      onMouseLeave={handleCustomEmojiMouseLeave}
                      onPointerDown={(event) => handleCustomEmojiPointerDown(event, customEmoji)}
                      onPointerUp={handleCustomEmojiPointerUp}
                      onPointerCancel={handleCustomEmojiPointerCancel}
                      onPointerLeave={(event) => {
                        if (event.pointerType !== 'mouse') handleCustomEmojiPointerCancel();
                      }}
                      onContextMenu={(event) => event.preventDefault()}
                      className="select-none rounded-lg p-2 [-webkit-touch-callout:none] hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label={`:${customEmoji.name}: を追加`}
                    >
                      <img src={getCustomEmojiImageSrc(customEmoji)} alt={`:${customEmoji.name}:`} width={32} height={32} draggable={false} className="h-8 w-8 select-none object-contain [-webkit-touch-callout:none]" />
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
                      onClick={() => handleReaction(emoji)}
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
    </>
  );
}
