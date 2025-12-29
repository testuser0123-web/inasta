'use client';

import { useState, useEffect } from 'react';
import { Heart, Trash2, BadgeCheck, Loader2, Share2, Send, User as UserIcon, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toggleLike, deletePost } from '@/app/actions/post';
import { addComment } from '@/app/actions/comment';
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

  const router = useRouter();

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

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

  const handleAddComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentText.trim()) return;

      setIsSubmittingComment(true);

      const formData = new FormData();
      formData.append('postId', post.id.toString());
      formData.append('text', commentText);

      const result = await addComment(null, formData);

      if (result?.success) {
          setCommentText('');
          router.refresh(); // Refresh to get the new comment from server
      } else {
          alert(result?.message || 'Failed to add comment');
      }

      setIsSubmittingComment(false);
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
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
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
                   <div className="flex items-center gap-2 ml-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
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
                        <Link href={`/users/${post.user.username}`} className="text-sm font-semibold hover:underline">
                           @{post.user.username}
                        </Link>
                        {post.user.isGold ? (
                          <BadgeCheck className="w-4 h-4 text-yellow-500 fill-yellow-500/10" />
                        ) : post.user.isVerified ? (
                          <BadgeCheck className="w-4 h-4 text-blue-500" />
                        ) : null}
                        {post.user.roles?.map(roleId => (
                           <div key={roleId} className="scale-75 origin-left flex item-center">
                               <RoleBadge roleId={roleId} />
                           </div>
                        ))}
                   </div>
               )}
           </div>

           {currentUserId === post.userId && (
              <button
               onClick={handleDelete}
               disabled={isDeleting}
               className="text-gray-400 dark:text-gray-500 hover:text-red-500 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
           )}
         </div>

         {post.comment && (
           <p className="text-gray-900 dark:text-gray-100 break-words mb-2">{post.comment}</p>
         )}

         <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
           {new Date(post.createdAt).toLocaleString('ja-JP', {
             timeZone: 'Asia/Tokyo',
             year: 'numeric',
             month: '2-digit',
             day: '2-digit',
             hour: '2-digit',
             minute: '2-digit',
           })}
         </div>

         {post.hashtags && post.hashtags.length > 0 && (
           <div className="flex flex-wrap gap-1 mb-4">
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

         {/* Comments Section */}
         <div className="space-y-3 border-t dark:border-gray-800 pt-3">
             {post.comments === undefined ? (
                 <div className="flex justify-center p-4">
                     <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                 </div>
             ) : (
               <>
                 {post.comments.map((comment) => (
                     <div key={comment.id} className="flex gap-2 items-start text-sm">
                         <Link href={`/users/${comment.user.username}`} className="font-bold hover:underline shrink-0 text-gray-900 dark:text-gray-100">
                             {comment.user.username}
                         </Link>
                         <span className="text-gray-800 dark:text-gray-200 break-words">{comment.text}</span>
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
       <div className="p-3 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0">
           <form onSubmit={handleAddComment} className="flex gap-2">
               <input
                   type="text"
                   value={commentText}
                   onChange={(e) => setCommentText(e.target.value)}
                   placeholder="Add a comment..."
                   maxLength={31}
                   className="flex-1 rounded-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-4 py-2"
               />
               <button
                   type="submit"
                   disabled={!commentText.trim() || isSubmittingComment}
                   className="p-2 text-primary dark:text-primary hover:text-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}
