'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDiary, saveDraft, getDraft, getOtherDrafts, loadDraftToDate } from '@/app/actions/diary';
import DiaryEditor from '@/components/DiaryEditor';
import { Loader2, Check, History, X } from 'lucide-react';
import { resizeImage } from '@/lib/image';
import { uploadImageToSupabase } from '@/lib/client-upload';

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

  const [editorKey, setEditorKey] = useState(0);
  const [otherDrafts, setOtherDrafts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingOtherDrafts, setIsLoadingOtherDrafts] = useState(false);

  const loadOtherDrafts = async () => {
    setIsLoadingOtherDrafts(true);
    try {
      const drafts = await getOtherDrafts(dateParam);
      setOtherDrafts(drafts);
    } catch (err) {
      console.error('Failed to load other drafts:', err);
    } finally {
      setIsLoadingOtherDrafts(false);
    }
  };

  const handleLoadDraft = async (draft: any) => {
    if (!confirm(`「${draft.title || 'タイトルなし'}」の下書きを読み込みますか？\n（現在の編集内容は上書きされます）`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await loadDraftToDate(draft.id, dateParam);
      if (result.success) {
        setTitle(result.draft.title);
        if (result.draft.content) {
          setInitialContent(JSON.stringify(result.draft.content));
        } else {
          setInitialContent(undefined);
        }
        setEditorKey(prev => prev + 1);
        setLastSavedAt(new Date());
        setIsModalOpen(false);
        alert('下書きを読み込みました！');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || '下書きの読み込みに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

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

    if (!thumbnailFile) {
      if (!confirm('サムネイルがありませんがよろしいですか？')) {
        return;
      }
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

        // Upload to Supabase
        const thumbnailUrl = await uploadImageToSupabase(compressedFile, 'diaries');
        formData.append('thumbnailUrl', thumbnailUrl);
        // We don't append thumbnailFile anymore to avoid Vercel Blob upload in server action if it still exists
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">日記を書く: {dateParam}</h1>
        <button
          type="button"
          onClick={() => {
            loadOtherDrafts();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <History className="w-4 h-4" />
          過去の下書きを読み込む
        </button>
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">本文</label>
          <DiaryEditor key={editorKey} onChange={setContent} initialContent={initialContent} />
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

      {/* Draft Loader Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border dark:border-gray-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <History className="w-5 h-5 text-amber-500" />
                過去の下書きを読み込む
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ※ 読み込むと、現在の編集内容は上書きされ、選んだ下書きの日付が <strong>{dateParam}</strong> に変更されます。
              </p>

              {isLoadingOtherDrafts ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <span>下書きを取得中...</span>
                </div>
              ) : otherDrafts.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  過去の下書き（未投稿のもの）が見つかりませんでした。
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {otherDrafts.map((draft) => (
                    <button
                      key={draft.id}
                      type="button"
                      onClick={() => handleLoadDraft(draft)}
                      className="w-full text-left p-4 border dark:border-gray-800 rounded-lg hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-all flex flex-col gap-1 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {draft.dateString}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 mt-1 line-clamp-1">
                        {draft.title || '(タイトルなし)'}
                      </h3>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
