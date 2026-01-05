'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { Heart, MessageCircle } from 'lucide-react';
import DiaryEditor from '@/components/DiaryEditor';
import { toggleDiaryLike, addDiaryComment } from '@/app/actions/diary';
import Link from 'next/link';

export default function DiaryDetailClient({ diary, currentUserId }: { diary: any, currentUserId?: number }) {
  // If undefined/null, treat as guest (or if specifically -1)
  const isGuest = !currentUserId || currentUserId === -1;

  const [hasLiked, setHasLiked] = useState(diary.likes.some((l: any) => l.userId === currentUserId));
  const [commentText, setCommentText] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [likeCount, setLikeCount] = useState<number>(diary.likes.length);

  const handleLike = async () => {
     if (isGuest) {
        alert("いいね機能を使用するにはログインが必要です。");
        return;
     }

     // Optimistic update
     setHasLiked(!hasLiked);
     setLikeCount((prev: number) => hasLiked ? prev - 1 : prev + 1);

     try {
        await toggleDiaryLike(diary.id);
     } catch (error) {
        // Revert
        setHasLiked(hasLiked);
        setLikeCount((prev: number) => hasLiked ? prev + 1 : prev - 1);
     }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (isGuest) {
        alert("コメント機能を使用するにはログインが必要です。");
        return;
     }

     if (!commentText.trim()) return;

     setIsCommentSubmitting(true);
     try {
        await addDiaryComment(diary.id, commentText);
        setCommentText('');
        // We can't easily optimistic update comment list without re-fetching or receiving the comment object
        // Assuming parent page or something refreshes, or we just clear text.
        // For simplicity, reload or just alert success?
        // Ideally we should use router.refresh() but that's in parent.
        // Since this is a client component, we can use useRouter.
     } catch (error) {
        alert('コメントの送信に失敗しました');
     } finally {
        setIsCommentSubmitting(false);
     }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4 sm:px-0 pt-6">
      <div className="mb-6">
         <div className="flex items-center gap-4 mb-6">
             <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {diary.user.avatarUrl ? (
                   <img src={diary.user.avatarUrl} alt={diary.user.username} crossOrigin="anonymous" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-lg">
                      {diary.user.username[0].toUpperCase()}
                   </div>
                )}
             </div>
             <div>
                <h1 className="text-3xl font-bold mb-1">{diary.title}</h1>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                   <span className="font-medium text-gray-900 dark:text-gray-100">{diary.user.username}</span>
                   <span>•</span>
                   <span>{format(new Date(diary.date), 'MMMM d, yyyy')}</span>
                </div>
             </div>
         </div>

         {diary.thumbnailUrl && (
            <div className="mb-8">
               <img
                  src={diary.thumbnailUrl}
                  alt={diary.title}
                  crossOrigin="anonymous"
                  className="w-full h-auto rounded-xl border dark:border-gray-800 object-cover max-h-[600px]"
               />
            </div>
         )}

         <div className="prose dark:prose-invert max-w-none mb-8">
             <DiaryEditor initialContent={JSON.stringify(diary.content)} readOnly={true} />
         </div>

         <div className="flex items-center gap-6 pt-6 border-t dark:border-gray-800">
            <button
               onClick={handleLike}
               className={`flex items-center gap-2 text-lg transition-colors ${
                 hasLiked ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'
               } ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
               <Heart className={`w-6 h-6 ${hasLiked ? 'fill-current' : ''}`} />
               <span>{likeCount}</span>
            </button>
            <div className="flex items-center gap-2 text-lg text-gray-500">
               <MessageCircle className="w-6 h-6" />
               <span>{diary.comments.length}</span>
            </div>
         </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
         <h3 className="text-lg font-bold mb-4">コメント</h3>

         <div className="space-y-4 mb-8">
            {diary.comments.length === 0 ? (
               <p className="text-gray-500 italic">コメントはまだありません。</p>
            ) : (
               diary.comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                         {comment.user.avatarUrl ? (
                            <img
                               src={comment.user.avatarUrl}
                               alt={comment.user.username}
                               crossOrigin="anonymous"
                               className="w-full h-full object-cover"
                            />
                         ) : (
                            <div className="w-full h-full bg-indigo-500" />
                         )}
                     </div>
                     <div className="bg-white dark:bg-black p-3 rounded-lg border dark:border-gray-800 flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <span className="font-bold text-sm">{comment.user.username}</span>
                           <span className="text-xs text-gray-400">{format(new Date(comment.createdAt), 'MMM d, HH:mm')}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{comment.text}</p>
                     </div>
                  </div>
               ))
            )}
         </div>

         {!isGuest ? (
            <form onSubmit={handleCommentSubmit} className="flex gap-3">
               <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="コメントを書く..."
                  className="flex-1 text-sm px-2 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-indigo-500 outline-none"
               />
               <button
                  type="submit"
                  disabled={isCommentSubmitting || !commentText.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
               >
                  送信
               </button>
            </form>
         ) : (
            <div className="text-center p-4">
                <p className="text-gray-500 text-sm">
                    <Link href="/login" className="text-indigo-500 hover:underline">ログイン</Link>してコメントに参加
                </p>
            </div>
         )}
      </div>
    </div>
  );
}
