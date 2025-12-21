'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDiary, saveDraft, getDraft } from '@/app/actions/diary';
import DiaryEditor from '@/components/DiaryEditor';
import { Loader2, Check } from 'lucide-react';
import { resizeImage } from '@/lib/image';

export default function NewDiaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await getDraft(dateParam);
        if (draft) {
          setTitle(draft.title);
          if (draft.content) {
            setInitialContent(JSON.stringify(draft.content));
          }
          // Note: Thumbnail restoration from draft is not fully implemented in UI preview
          // but if we submit without changing it, it should keep the old one (if backend handles it, which it does)
        }
      } catch (error) {
        console.error('Failed to load draft', error);
      }
    };
    loadDraft();
  }, [dateParam]);

  const saveDraftToBackend = useCallback(async (currentTitle: string, currentContent: string) => {
    if (!currentTitle && !currentContent) return;

    setIsSavingDraft(true);
    try {
      const formData = new FormData();
      formData.append('title', currentTitle);
      formData.append('content', currentContent);
      formData.append('date', dateParam);
      // Not uploading thumbnail in draft auto-save to avoid spamming storage

      const result = await saveDraft(formData);
      if (result.saved) {
        setLastSavedAt(new Date());
      }
    } catch (error) {
      console.error('Failed to save draft', error);
    } finally {
      setIsSavingDraft(false);
    }
  }, [dateParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Don't save if empty or initial load not done
      if (title || content) {
        saveDraftToBackend(title, content);
      }
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timer);
  }, [title, content, saveDraftToBackend]);

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
        const compressedBlob = await resizeImage(thumbnailFile);
        const newFileName = thumbnailFile.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const compressedFile = new File([compressedBlob], newFileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        formData.append('thumbnailFile', compressedFile);
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
          <DiaryEditor onChange={setContent} initialContent={initialContent} />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 flex items-center gap-2 h-6">
            {isSavingDraft ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>下書き保存中...</span>
              </>
            ) : lastSavedAt ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span>下書き保存済み ({lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
              </>
            ) : null}
          </div>
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
