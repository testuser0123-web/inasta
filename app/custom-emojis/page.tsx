import CustomEmojiManager from './CustomEmojiManager';

export default function CustomEmojisPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-black md:ml-64">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">カスタム絵文字</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">作成済みの絵文字を確認・編集できます。</p>
        <CustomEmojiManager />
      </div>
    </main>
  );
}
