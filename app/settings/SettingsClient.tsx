'use client';

import { useActionState, useEffect, useState } from 'react';
import { changePassword, updateSettings } from '@/app/actions/user';
import { ArrowLeft, Moon, Sun, Laptop } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

type SettingsPageProps = {
    initialExcludeUnverifiedPosts: boolean;
    initialShowMobileQuickNav: boolean;
};

export default function SettingsClient({ initialExcludeUnverifiedPosts, initialShowMobileQuickNav }: SettingsPageProps) {
  const [passwordState, passwordAction, isPasswordPending] = useActionState(changePassword, undefined);
  const [settingsState, settingsAction, isSettingsPending] = useActionState(updateSettings, undefined);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100">
        <div className="sticky top-0 z-40 bg-white dark:bg-black border-b dark:border-gray-800 px-4 py-3 flex items-center shadow-sm">
            <Link href="/profile" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white mr-4">
                <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg font-bold">設定</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-8">
            {/* Theme Settings */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">外観</h2>
                <div className="border dark:border-gray-800 p-4 rounded-lg shadow-sm">
                    {mounted ? (
                        <div className="flex space-x-2">
                             <button
                                onClick={() => setTheme('light')}
                                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                                    theme === 'light'
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                <Sun className="w-6 h-6 mb-2" />
                                <span className="text-sm font-medium">ライト</span>
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                                    theme === 'dark'
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                <Moon className="w-6 h-6 mb-2" />
                                <span className="text-sm font-medium">ダーク</span>
                            </button>
                            <button
                                onClick={() => setTheme('system')}
                                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                                    theme === 'system'
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                <Laptop className="w-6 h-6 mb-2" />
                                <span className="text-sm font-medium">端末設定</span>
                            </button>
                        </div>
                    ) : (
                         <div className="h-24 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
                    )}
                </div>
            </section>

            {/* Feed Settings */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">その他の設定</h2>
                <form action={settingsAction} className="space-y-4 border dark:border-gray-800 p-4 rounded-lg shadow-sm">
                     <div className="flex items-center justify-between">
                        <label htmlFor="excludeUnverifiedPosts" className="text-gray-900 dark:text-gray-100 font-medium">
                            未認証ユーザーの投稿を除外する (すべてタブ)
                        </label>
                        <input
                            type="checkbox"
                            id="excludeUnverifiedPosts"
                            name="excludeUnverifiedPosts"
                            defaultChecked={initialExcludeUnverifiedPosts}
                            className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-600 dark:bg-gray-700"
                        />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        ※フォロータブには影響しません
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
                        <label htmlFor="showMobileQuickNav" className="text-gray-900 dark:text-gray-100 font-medium">
                            ホーム画面にクイックナビを表示 (モバイルのみ)
                        </label>
                        <input
                            type="checkbox"
                            id="showMobileQuickNav"
                            name="showMobileQuickNav"
                            defaultChecked={initialShowMobileQuickNav}
                            className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-600 dark:bg-gray-700"
                        />
                    </div>

                    {settingsState?.message && (
                        <div className={`text-sm ${settingsState.success ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {settingsState.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSettingsPending}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isSettingsPending ? '保存中...' : '設定を保存'}
                    </button>
                </form>
            </section>

            {/* Password Change */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">パスワード変更</h2>
                <form action={passwordAction} className="space-y-4 border dark:border-gray-800 p-4 rounded-lg shadow-sm">
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            現在のパスワード
                        </label>
                        <input
                            type="password"
                            id="currentPassword"
                            name="currentPassword"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                        />
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            新しいパスワード
                        </label>
                        <input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                        />
                    </div>

                    {passwordState?.message && (
                        <div className={`text-sm ${passwordState.success ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {passwordState.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPasswordPending}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isPasswordPending ? '変更中...' : 'パスワードを変更'}
                    </button>
                </form>
            </section>
        </div>
    </div>
  );
}
