import Link from 'next/link';
import { getContests } from '@/app/actions/contest';

export default async function ContestList({ tab }: { tab: 'active' | 'ended' }) {
  const contests = await getContests(tab);

  return (
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
            className="block bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-primary transition-colors"
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
  );
}
