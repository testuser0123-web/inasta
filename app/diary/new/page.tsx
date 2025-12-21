'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDiary, saveDraft, getDraft } from '@/app/actions/diary';
import DiaryEditor from '@/components/DiaryEditor';
import { Loader2, Check } from 'lucide-react';

export default function NewDiaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  // Load draft
  useEffect(() => {
    async function loadDraft() {
      try {
        const draft = await getDraft(dateParam);
        if (draft) {
          setTitle(draft.title);
          if (draft.content) {
             const contentStr = typeof draft.content === 'string'
                ? draft.content
                : JSON.stringify(draft.content);
             setInitialContent(contentStr);
             setContent(contentStr); // Also set current content state
          }
          if (draft.thumbnailUrl) {
              setThumbnailUrl(draft.thumbnailUrl);
          }
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      } finally {
        setIsLoadingDraft(false);
      }
    }
    loadDraft();
  }, [dateParam]);

  // Auto-save logic
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContent = useRef<{title: string, content: string} | null>(null);

  useEffect(() => {
      // Don't auto-save while loading or if content is empty/initial
      if (isLoadingDraft) return;

      // Don't save if nothing changed from last save (to avoid initial save loop)
      if (lastSavedContent.current &&
          lastSavedContent.current.title === title &&
          lastSavedContent.current.content === content) {
          return;
      }

      // Skip if completely empty (unless we deleted everything?)
      // Actually, saving empty draft is fine if user deleted text.
      // But maybe avoid saving immediately on mount if empty.
      if (!title && !content) return;

      if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus('saving');

      saveTimeoutRef.current = setTimeout(async () => {
          try {
              const formData = new FormData();
              formData.append('title', title);
              formData.append('content', content);
              formData.append('date', dateParam);
              // We don't auto-save file uploads efficiently here, skipping file for auto-save
              // Unless we want to support it, but it requires upload.
              // For now, persist existing thumbnailUrl if exists.
              if (thumbnailUrl) {
                  formData.append('thumbnailUrl', thumbnailUrl);
              }

              await saveDraft(formData);
              setSaveStatus('saved');
              lastSavedContent.current = { title, content };
          } catch (e) {
              console.error("Auto-save failed", e);
              setSaveStatus('error');
          }
      }, 2000); // 2 seconds debounce

      return () => {
          if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
          }
      };
  }, [title, content, dateParam, thumbnailUrl, isLoadingDraft]);

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
      if (thumbnailUrl) { // Pass existing URL if no new file
          formData.append('thumbnailUrl', thumbnailUrl);
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

  if (isLoadingDraft) {
      return (
          <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">日記を書く: {dateParam}</h1>
          <div className="text-sm text-gray-500 flex items-center gap-2 h-6">
              {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>下書き保存中...</span>
                  </>
              )}
              {saveStatus === 'saved' && (
                  <>
                    <Check className="w-3 h-3" />
                    <span>下書き保存済み</span>
                  </>
              )}
              {saveStatus === 'error' && <span className="text-red-500">保存失敗</span>}
          </div>
      </div>

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
           {thumbnailUrl && !thumbnailFile && (
               <div className="mt-2 text-sm text-gray-500">
                   現在設定されているサムネイルがあります (新しいファイルを選択すると上書きされます)
               </div>
           )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">本文</label>
          {/* Force remount if initialContent changes to ensure editor picks it up, though LoadInitialContent handles it */}
          <DiaryEditor onChange={setContent} initialContent={initialContent} />
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
