import UploadForm from '@/components/UploadForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';

export default async function UploadPage() {
  const session = await getSession();

  if (session?.username === 'guest') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-xl font-bold mb-4">ゲストユーザーは投稿できません</h1>
        <p className="mb-6 text-gray-500">
          投稿機能を利用するには、アカウントを作成してログインしてください。
        </p>
        <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500">
          ホームに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b dark:border-gray-800 px-4 py-3 flex items-center justify-between relative shadow-sm bg-background text-foreground">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-semibold">New Post</h1>
        <div className="w-6" /> {/* Spacer for symmetry */}
      </div>
      <UploadForm />
    </div>
  );
}
