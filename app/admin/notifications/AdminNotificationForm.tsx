'use client';

import { createDeveloperNotification } from '@/app/actions/notification';
import { useState } from 'react';

export default function AdminNotificationForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await createDeveloperNotification(formData);

    if (result.success) {
      setMessage(result.message || 'Success');
      (event.target as HTMLFormElement).reset();
    } else {
      setError(result.error || 'Failed');
    }
    setIsSubmitting(false);
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">通知を作成</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">送るユーザー名 (あれば)</label>
          <input
            name="targetUsername"
            placeholder="全ユーザーに送るには空にしてください"
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1"> タイトル </label>
          <input
            name="title"
            required
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1"> 内容 </label>
          <textarea
            name="content"
            className="w-full p-2 border rounded h-32 dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1"> 送信元 </label>
          <select name="type" className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700">
            <option value="DEVELOPER"> 開発者 </option>
            <option value="SYSTEM"> システム </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1"> 管理者パスワード </label>
          <input
            name="password"
            type="password"
            required
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        {message && <div className="p-2 bg-green-100 text-green-700 rounded">{message}</div>}
        {error && <div className="p-2 bg-red-100 text-red-700 rounded">{error}</div>}

        <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-2 rounded hover:bg-primary-hover disabled:opacity-50"
        >
            {isSubmitting ? '送信中...' : '通知を送る'}
        </button>
      </form>
    </div>
  );
}
