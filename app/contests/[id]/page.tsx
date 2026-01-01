import { getContest } from '@/app/actions/contest';
import Link from 'next/link';
import { ArrowLeft, Info, Calendar } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import ContestPostsFetcher from '@/components/ContestPostsFetcher';
import { Spinner } from '@/components/ui/spinner';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ContestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  const contestId = Number(id);
  const resolvedSearchParams = await searchParams;
  const sort = resolvedSearchParams.sort || 'newest'; // newest, oldest, likes_desc, likes_asc, trophy
  const session = await getSession();

  const contest = await getContest(contestId);
  if (!contest) return notFound();

  const isEnded = new Date() > contest.endDate;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
       {/* Header */}
       <div className="sticky top-0 z-30 bg-white dark:bg-black border-b dark:border-gray-800 shadow-sm p-4">
          <div className="flex items-center gap-4 mb-4">
             <Link href="/contests" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white">
                <ArrowLeft className="w-6 h-6" />
             </Link>
             <h1 className="text-lg font-bold dark:text-white truncate flex-1">{contest.title}</h1>
             {!isEnded && session && (
                 <Link href={`/contests/${contest.id}/upload`} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 whitespace-nowrap">
                    参加する
                 </Link>
             )}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
             <div className="flex items-center gap-2 mb-2 text-xs tracking-wider font-semibold text-gray-500">
                <Info className="w-3 h-3" /> 概要
             </div>
             <p className="mb-3">{contest.description || "説明はありません。"}</p>
             <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>終了: {contest.endDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</span>
                {isEnded && <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold ml-2">終了</span>}
             </div>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                  { id: 'newest', label: '新着順' },
                  { id: 'oldest', label: '古い順' },
                  { id: 'likes_desc', label: '人気順' },
                  { id: 'likes_asc', label: 'マイナー順' },
                  ...(isEnded ? [{ id: 'trophy', label: 'ランキング 🏆' }] : [])
              ].map(opt => (
                  <Link
                    key={opt.id}
                    href={`/contests/${contestId}?sort=${opt.id}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                        sort === opt.id
                            ? 'bg-black dark:bg-white text-white dark:text-black border-transparent'
                            : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900'
                    }`}
                  >
                      {opt.label}
                  </Link>
              ))}
          </div>
       </div>

       {/* Feed */}
       <Suspense fallback={<div className="h-64"><Spinner /></div>}>
         <ContestPostsFetcher contestId={contestId} sort={sort} isEnded={isEnded} />
       </Suspense>
    </div>
  );
}
