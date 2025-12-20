'use client';

import { useState } from 'react';
import DiaryEditor from '@/components/DiaryEditor';
import { Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface DiaryDetailProps {
  diary: any;
  currentUserId?: number;
  toggleLike: (id: number) => Promise<void>;
  addComment: (id: number, text: string) => Promise<void>;
}

export function DiaryDetailClient({ diary, currentUserId, toggleLike, addComment }: DiaryDetailProps) {
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');

  const hasLiked = diary.likes.some((like: any) => like.userId === currentUserId);

  const handleLike = async () => {
     if (!currentUserId) return;
     await toggleLike(diary.id);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUserId) return;

    setIsCommentSubmitting(true);
    await addComment(diary.id, commentText);
    setCommentText('');
    setIsCommentSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <Link href={`/diary?date=${format(new Date(diary.date), 'yyyy-MM-dd')}`} className="inline-flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Diaries</span>
      </Link>

      <div className="bg-white dark:bg-black border dark:border-gray-800 rounded-xl p-8 shadow-sm">
         <div className="flex items-center gap-4 mb-6 pb-6 border-b dark:border-gray-800">
             <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                {diary.user.avatarUrl ? (
                   <img src={diary.user.avatarUrl} alt={diary.user.username} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white font-bold">
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

         <div className="prose dark:prose-invert max-w-none mb-8">
             <DiaryEditor initialContent={JSON.stringify(diary.content)} readOnly={true} />
         </div>

         <div className="flex items-center gap-6 pt-6 border-t dark:border-gray-800">
            <button
               onClick={handleLike}
               disabled={!currentUserId}
               className={`flex items-center gap-2 text-lg transition-colors ${hasLiked ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'}`}
            >
               <Heart className={`w-6 h-6 ${hasLiked ? 'fill-current' : ''}`} />
               <span>{diary.likes.length}</span>
            </button>
            <div className="flex items-center gap-2 text-lg text-gray-500">
               <MessageCircle className="w-6 h-6" />
               <span>{diary.comments.length}</span>
            </div>
         </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
         <h3 className="text-lg font-bold mb-4">Comments</h3>

         <div className="space-y-4 mb-8">
            {diary.comments.length === 0 ? (
               <p className="text-gray-500 italic">No comments yet.</p>
            ) : (
               diary.comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                         {comment.user.avatarUrl ? (
                            <img src={comment.user.avatarUrl} className="w-full h-full object-cover" />
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

         {currentUserId && (
            <form onSubmit={handleCommentSubmit} className="flex gap-3">
               <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-indigo-500 outline-none"
               />
               <button
                  type="submit"
                  disabled={isCommentSubmitting || !commentText.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
               >
                  Send
               </button>
            </form>
         )}
      </div>
    </div>
  );
}
