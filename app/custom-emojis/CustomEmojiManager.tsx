'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { createCustomEmoji, deleteCustomEmoji, fetchCustomEmojis, updateCustomEmoji } from '@/app/actions/custom-emoji';
import { uploadCustomEmojiImage } from '@/lib/client-upload';
import type { CustomEmojiSummary } from '@/lib/reactions';

function customEmojiImageSrc(customEmoji: CustomEmojiSummary) {
  return customEmoji.imageUrl ? `/api/custom_emoji/${customEmoji.id}.webp` : customEmoji.imageUrl;
}

export default function CustomEmojiManager({ currentUserId }: { currentUserId: number | null }) {
  const [customEmojis, setCustomEmojis] = useState<CustomEmojiSummary[]>([]);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [editingNames, setEditingNames] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canEditEmoji = (emoji: CustomEmojiSummary) => currentUserId !== null && emoji.creatorId === currentUserId;
  const hasEmojiChanged = (emoji: CustomEmojiSummary) => (editingNames[emoji.id] ?? emoji.name).trim() !== emoji.name;

  const loadCustomEmojis = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const emojis = await fetchCustomEmojis();
      setCustomEmojis(emojis);
      setEditingNames(Object.fromEntries(emojis.map((emoji) => [emoji.id, emoji.name])));
    } catch {
      setStatus('カスタム絵文字を読み込めませんでした。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomEmojis();
  }, []);

  const handleCreate = async () => {
    if (!file) {
      setStatus('画像ファイルを選択してください。');
      return;
    }

    setIsSaving(true);
    setStatus(null);
    try {
      const uploaded = await uploadCustomEmojiImage(file);
      const result = await createCustomEmoji({
        name,
        imageUrl: uploaded.publicUrl,
        storagePath: uploaded.storagePath,
        mimeType: uploaded.mimeType,
        width: uploaded.width,
        height: uploaded.height,
      });

      if (!result.success || !result.customEmoji) {
        setStatus(result.message ?? 'カスタム絵文字を作成できませんでした。');
        return;
      }

      setName('');
      setFile(null);
      await loadCustomEmojis();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'カスタム絵文字を作成できませんでした。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (emoji: CustomEmojiSummary) => {
    setIsSaving(true);
    setStatus(null);
    try {
      const result = await updateCustomEmoji({ id: emoji.id, name: editingNames[emoji.id] ?? emoji.name });
      if (!result.success) {
        setStatus(result.message ?? 'カスタム絵文字を更新できませんでした。');
        return;
      }
      await loadCustomEmojis();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (emoji: CustomEmojiSummary) => {
    if (!confirm(`:${emoji.name}: を削除しますか？`)) return;

    setIsSaving(true);
    setStatus(null);
    try {
      const result = await deleteCustomEmoji(emoji.id);
      if (!result.success) {
        setStatus(result.message ?? 'カスタム絵文字を削除できませんでした。');
        return;
      }
      await loadCustomEmojis();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">新規作成</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="emoji_name"
            maxLength={32}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <div className="flex flex-col gap-1">
            <input
              id="custom-emoji-file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <label
              htmlFor="custom-emoji-file"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <ImagePlus className="h-4 w-4" />
              ファイルを選択
            </label>
            <span className="truncate text-xs text-gray-500 dark:text-gray-400">{file?.name ?? 'ファイルが選択されていません'}</span>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            作成
          </button>
        </div>
      </section>

      {status && <p className="text-sm text-red-500">{status}</p>}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">作成済み絵文字一覧</h2>
        {isLoading ? (
          <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : customEmojis.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">カスタム絵文字はまだありません。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {customEmojis.map((emoji) => {
              const canEdit = canEditEmoji(emoji);
              const hasChanged = hasEmojiChanged(emoji);

              return (
                <div key={emoji.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                  <img src={customEmojiImageSrc(emoji)} alt={`:${emoji.name}:`} width={48} height={48} className="h-12 w-12 rounded-md object-contain" />
                  <input
                    type="text"
                    value={editingNames[emoji.id] ?? emoji.name}
                    onChange={(event) => setEditingNames((current) => ({ ...current, [emoji.id]: event.target.value }))}
                    maxLength={32}
                    disabled={!canEdit}
                    aria-label={`:${emoji.name}: の名前`}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(emoji)}
                    disabled={isSaving || !canEdit || !hasChanged}
                    className="rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(emoji)}
                    disabled={isSaving || !canEdit}
                    className="rounded-full p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950"
                    aria-label={`:${emoji.name}: を削除`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
