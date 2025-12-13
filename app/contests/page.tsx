import Link from 'next/link';
import { getContests } from '@/app/actions/contest';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams.tab === 'ended' ? 'ended' : 'active';
  const contests = await getContests(tab);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b dark:border-gray-800 shadow-sm p-4 flex items-center justify-between">
        <div className="w-12 md:hidden" /> {/* Hamburger spacer */}
        <h1 className="text-xl font-bold dark:text-white absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">コンテスト</h1>
        {tab === 'active' ? (
             <Link href="/contests/create" className="bg-indigo-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-indigo-700 flex items-center gap-1 z-10">
                <Plus className="w-4 h-4" /> 作成
             </Link>
        ) : <div className="w-16" />}
      </div>

      <div className="flex border-b dark:border-gray-800">
        <Link
          href="/contests?tab=active"
          className={`flex-1 text-center py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'active'
              ? 'border-black dark:border-white text-black dark:text-white'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800'
          }`}
        >
          開催中
        </Link>
        <Link
          href="/contests?tab=ended"
          className={`flex-1 text-center py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'ended'
              ? 'border-black dark:border-white text-black dark:text-white'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800'
          }`}
        >
          終了
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {contests.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {tab === 'active' ? '開催中のコンテストはありません' : '終了したコンテストはありません'}
          </div>
        ) : (
          contests.map((contest) => (
            <Link
              key={contest.id}
              href={`/contests/${contest.id}`}
              className="block bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
            >
              <h2 className="text-lg font-bold dark:text-white mb-1">{contest.title}</h2>
              {contest.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">{contest.description}</p>
              )}
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-500">
                <span>開催者: @{contest.creator.username}</span>
                <div className="flex gap-3">
                     <span>{contest._count.posts} 投稿</span>
                     <span>終了: {contest.endDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
