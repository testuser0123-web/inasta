'use client';

import { useActionState } from 'react';
import { createSuggestion } from '@/app/actions/suggestion';
import { Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const initialState = {
  error: '',
  success: false,
};

export default function SuggestionPage() {
  const [state, action, isPending] = useActionState(createSuggestion, initialState);
  const router = useRouter();
  const [content, setContent] = useState('');

  useEffect(() => {
    if (state.success) {
      alert('投書を送信しました。貴重なご意見ありがとうございます！');
      router.push('/');
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-3xl">📬</span>
        投書箱
      </h1>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border dark:border-gray-800">
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          INASTAに対するご要望、バグ報告、その他ご意見をお聞かせください。<br />
          開発者が直接確認し、より良いサービスの開発に役立てさせていただきます。<br />
          <span className="text-sm text-gray-500 mt-2 block">
            ※送信された内容は開発者のみが閲覧できます。
          </span>
        </p>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="content" className="font-medium block">
              ご意見・ご要望
            </label>
            <textarea
              id="content"
              name="content"
              rows={6}
              className="w-full p-3 rounded-lg border dark:border-gray-700 bg-transparent resize-none focus:ring-2 focus:ring-primary outline-none"
              placeholder="ここに内容を入力してください..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {state.error && (
            <p className="text-red-500 text-sm font-medium">{state.error}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  送信する
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
