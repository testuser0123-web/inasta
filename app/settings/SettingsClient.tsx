'use client';

import { useActionState, useEffect, useState } from 'react';
import { changePassword, updateSettings } from '@/app/actions/user';
import { ArrowLeft, Moon, Sun, Laptop } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

type SettingsPageProps = {
    initialExcludeUnverifiedPosts: boolean;
    initialShowMobileQuickNav: boolean;
    initialThemeColor: string;
};

const THEME_COLORS = [
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Teal', value: '#14b8a6' },
];

export default function SettingsClient({ initialExcludeUnverifiedPosts, initialShowMobileQuickNav, initialThemeColor }: SettingsPageProps) {
  const [passwordState, passwordAction, isPasswordPending] = useActionState(changePassword, undefined);
  const [settingsState, settingsAction, isSettingsPending] = useActionState(updateSettings, undefined);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedColor, setSelectedColor] = useState(initialThemeColor);

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

                {/* Mode Selection */}
                <div className="border dark:border-gray-800 p-4 rounded-lg shadow-sm space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">モード</h3>
                    {mounted ? (
                        <div className="flex space-x-2">
                             <button
                                onClick={() => setTheme('light')}
                                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                                    theme === 'light'
                                        ? 'border-brand bg-indigo-50 dark:bg-indigo-900/20 text-brand'
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
                                        ? 'border-brand bg-indigo-50 dark:bg-indigo-900/20 text-brand'
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
                                        ? 'border-brand bg-indigo-50 dark:bg-indigo-900/20 text-brand'
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

                {/* Color Selection */}
                 <form action={settingsAction} className="border dark:border-gray-800 p-4 rounded-lg shadow-sm space-y-4">
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">アクセントカラー</h3>
                        <div className="flex flex-wrap gap-3">
                            {THEME_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                                        selectedColor === color.value
                                            ? 'border-gray-900 dark:border-white scale-110'
                                            : 'border-transparent hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    aria-label={color.name}
                                >
                                     {selectedColor === color.value && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                                </button>
                            ))}

                            {/* Custom Color Picker */}
                            <div className="relative">
                                <input
                                    type="color"
                                    value={selectedColor}
                                    onChange={(e) => setSelectedColor(e.target.value)}
                                    className="w-10 h-10 rounded-full overflow-hidden p-0 border-0 cursor-pointer opacity-0 absolute inset-0"
                                    aria-label="カスタムカラー"
                                />
                                <div
                                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center pointer-events-none transition-all ${
                                        !THEME_COLORS.some(c => c.value === selectedColor)
                                            ? 'border-gray-900 dark:border-white scale-110'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                    style={{
                                        background: !THEME_COLORS.some(c => c.value === selectedColor)
                                            ? selectedColor
                                            : 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #00FF00 120deg, #0000FF 240deg, #FF0000 360deg)'
                                    }}
                                >
                                     {!THEME_COLORS.some(c => c.value === selectedColor) && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                                </div>
                            </div>
                        </div>
                        <input type="hidden" name="themeColor" value={selectedColor} />
                    </div>

                    <div className="pt-4 border-t dark:border-gray-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="excludeUnverifiedPosts" className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                未認証ユーザーの投稿を除外 (すべてタブ)
                            </label>
                            <input
                                type="checkbox"
                                id="excludeUnverifiedPosts"
                                name="excludeUnverifiedPosts"
                                defaultChecked={initialExcludeUnverifiedPosts}
                                className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-brand focus:ring-brand dark:bg-gray-700"
                            />
                        </div>

                         <div className="flex items-center justify-between">
                            <label htmlFor="showMobileQuickNav" className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                クイックナビを表示 (モバイル)
                            </label>
                            <input
                                type="checkbox"
                                id="showMobileQuickNav"
                                name="showMobileQuickNav"
                                defaultChecked={initialShowMobileQuickNav}
                                className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-brand focus:ring-brand dark:bg-gray-700"
                            />
                        </div>
                    </div>

                    {settingsState?.message && (
                        <div className={`text-sm ${settingsState.success ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {settingsState.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSettingsPending}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 transition-colors"
                        style={{ backgroundColor: selectedColor }} // Preview the color immediately on the save button
                    >
                        {isSettingsPending ? '保存中...' : '設定を保存'}
                    </button>
                </form>
            </section>

            {/* Password Change */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">セキュリティ</h2>
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
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 py-2 px-3 shadow-sm focus:border-brand focus:ring-brand sm:text-sm border"
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
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 py-2 px-3 shadow-sm focus:border-brand focus:ring-brand sm:text-sm border"
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
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 transition-colors"
                    >
                        {isPasswordPending ? '変更中...' : 'パスワードを変更'}
                    </button>
                </form>
            </section>
        </div>
    </div>
  );
}
