'use client';

import { useActionState } from 'react';
import { changePassword, updateSettings } from '@/app/actions/user';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type SettingsPageProps = {
    initialExcludeUnverifiedPosts: boolean;
};

export default function SettingsClient({ initialExcludeUnverifiedPosts }: SettingsPageProps) {
  const [passwordState, passwordAction, isPasswordPending] = useActionState(changePassword, undefined);
  const [settingsState, settingsAction, isSettingsPending] = useActionState(updateSettings, undefined);

  return (
    <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center shadow-sm">
            <Link href="/profile" className="text-gray-700 hover:text-black mr-4">
                <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg font-bold">Settings</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-8">
            {/* Feed Settings */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">フィード設定</h2>
                <form action={settingsAction} className="space-y-4 border p-4 rounded-lg shadow-sm">
                     <div className="flex items-center justify-between">
                        <label htmlFor="excludeUnverifiedPosts" className="text-gray-900 font-medium">
                            未認証ユーザーの投稿を除外する (ALLタブ)
                        </label>
                        <input
                            type="checkbox"
                            id="excludeUnverifiedPosts"
                            name="excludeUnverifiedPosts"
                            defaultChecked={initialExcludeUnverifiedPosts}
                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                    </div>
                    <div className="text-sm text-gray-500">
                        ※FOLLOWINGタブには影響しません
                    </div>

                    {settingsState?.message && (
                        <div className={`text-sm ${settingsState.success ? 'text-green-600' : 'text-red-500'}`}>
                            {settingsState.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSettingsPending}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isSettingsPending ? 'Saving...' : '設定を保存'}
                    </button>
                </form>
            </section>

            {/* Password Change */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">パスワード変更</h2>
                <form action={passwordAction} className="space-y-4 border p-4 rounded-lg shadow-sm">
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                            現在のパスワード
                        </label>
                        <input
                            type="password"
                            id="currentPassword"
                            name="currentPassword"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                        />
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                            新しいパスワード
                        </label>
                        <input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                        />
                    </div>

                    {passwordState?.message && (
                        <div className={`text-sm ${passwordState.success ? 'text-green-600' : 'text-red-500'}`}>
                            {passwordState.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPasswordPending}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isPasswordPending ? 'Changing...' : 'パスワードを変更'}
                    </button>
                </form>
            </section>
        </div>
    </div>
  );
}
