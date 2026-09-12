'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateDiary, deleteDiary } from '@/app/actions/diary';
import DiaryEditor from '@/components/DiaryEditor';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { resizeImage } from '@/lib/image';
import { uploadImageToSupabase } from '@/lib/client-upload';
import DeleteDiaryModal from '@/components/DeleteDiaryModal';
import Image from 'next/image';

interface EditDiaryClientProps {
  diary: {
    id: number;
    title: string;
    content: any;
    thumbnailUrl: string | null;
    date: Date;
    userId: number;
  };
}

export default function EditDiaryClient({ diary }: EditDiaryClientProps) {
  const router = useRouter();
  const dateStr = new Date(diary.date).toISOString().split('T')[0];

  const [title, setTitle] = useState(diary.title);
  // Keep the loaded document separate from onChange output: reloading each
  // keystroke resets Lexical's selection and Android IME composition.
  const [initialContent] = useState(() => JSON.stringify(diary.content));
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [deleteThumbnail, setDeleteThumbnail] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      formData.append('deleteThumbnail', deleteThumbnail ? 'true' : 'false');

      if (thumbnailFile && !deleteThumbnail) {
        const compressedBlob = await resizeImage(thumbnailFile);
        const newFileName = thumbnailFile.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const compressedFile = new File([compressedBlob], newFileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        // Upload to Supabase
        const thumbnailUrl = await uploadImageToSupabase(compressedFile, 'diaries');
        formData.append('thumbnailUrl', thumbnailUrl);
      }

      await updateDiary(diary.id, formData);
      router.push(`/diary/${diary.id}`);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert('日記の更新に失敗しました');
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteDiary(diary.id);
      router.push('/diary');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('日記の削除に失敗しました');
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">日記を編集: {dateStr}</h1>
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
          <label className="block text-sm font-medium mb-2">サムネイル</label>
          {diary.thumbnailUrl && !deleteThumbnail && (
            <div className="mb-4 relative w-48 h-32 rounded-lg overflow-hidden border dark:border-gray-800">
              <Image
                src={diary.thumbnailUrl}
                alt="Current thumbnail"
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              disabled={deleteThumbnail}
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100 disabled:opacity-50"
            />

            {diary.thumbnailUrl && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={deleteThumbnail}
                  onChange={(e) => {
                    setDeleteThumbnail(e.target.checked);
                    if (e.target.checked) {
                      setThumbnailFile(null);
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                現在のサムネイルを削除する
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">本文</label>
          <DiaryEditor onChange={setContent} initialContent={initialContent} />
        </div>

        <div className="flex flex-col gap-4 border-t dark:border-gray-800 pt-6">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              <Trash2 className="w-4 h-4" />
              日記を削除
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              更新する
            </button>
          </div>
        </div>
      </form>

      <DeleteDiaryModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
