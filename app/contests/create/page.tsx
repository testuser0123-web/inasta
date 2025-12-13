'use client';

import { useActionState } from 'react';
import { createContest } from '@/app/actions/contest';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateContestPage() {
  const [state, action, isPending] = useActionState(createContest, undefined);

  return (
    <div className="min-h-screen bg-white dark:bg-black p-4">
       <div className="flex items-center gap-4 mb-6">
        <Link href="/contests" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white">
            <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-bold dark:text-white">コンテスト作成</h1>
      </div>

      <form action={action} className="space-y-6 max-w-md mx-auto">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            タイトル
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            maxLength={100}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            説明
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={500}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            期間
          </label>
          <select
            id="duration"
            name="duration"
            defaultValue="3"
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {d} 日間
              </option>
            ))}
          </select>
        </div>

        {state?.message && (
          <div className="text-red-500 text-sm">
             {typeof state.message === 'string' ? state.message : JSON.stringify(state.message)}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isPending ? '作成中...' : 'コンテストを作成'}
        </button>
      </form>
    </div>
  );
}
