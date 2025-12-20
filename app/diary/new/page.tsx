'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDiary } from '@/app/actions/diary';
import DiaryEditor from '@/components/DiaryEditor';
import { Loader2 } from 'lucide-react';

export default function NewDiaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      alert('タイトルと本文を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('date', dateParam);
      if (thumbnailFile) {
        formData.append('thumbnailFile', thumbnailFile);
      }

      await createDiary(formData);
    } catch (error: any) {
      if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
      console.error(error);
      alert('投稿に失敗しました');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">日記を書く: {dateParam}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-800"
            placeholder="日記のタイトル"
            required
          />
        </div>

        <div>
           <label className="block text-sm font-medium mb-2">サムネイル (任意)</label>
           <input
             type="file"
             accept="image/*"
             onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
             className="block w-full text-sm text-gray-500
               file:mr-4 file:py-2 file:px-4
               file:rounded-full file:border-0
               file:text-sm file:font-semibold
               file:bg-indigo-50 file:text-indigo-700
               hover:file:bg-indigo-100"
           />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">本文</label>
          <DiaryEditor onChange={setContent} />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            日記を投稿する
          </button>
        </div>
      </form>
    </div>
  );
}
