import { getContest, fetchContestPosts, getContestWinners } from '@/app/actions/contest';
import Link from 'next/link';
import { ArrowLeft, Clock, Info, Trophy, Grid, Calendar } from 'lucide-react';
import ContestFeed from '@/components/ContestFeed';
import { notFound } from 'next/navigation';

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

  const contest = await getContest(contestId);
  if (!contest) return notFound();

  const isEnded = new Date() > contest.endDate;
  const isTrophyView = isEnded && sort === 'trophy';

  let posts: any[] = [];
  if (isTrophyView) {
      posts = await getContestWinners(contestId);
  } else {
      posts = await fetchContestPosts({ contestId, sortBy: sort });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
       {/* Header */}
       <div className="sticky top-0 z-30 bg-white dark:bg-black border-b dark:border-gray-800 shadow-sm p-4">
          <div className="flex items-center gap-4 mb-4">
             <Link href="/contests" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white">
                <ArrowLeft className="w-6 h-6" />
             </Link>
             <h1 className="text-lg font-bold dark:text-white truncate flex-1">{contest.title}</h1>
             {!isEnded && (
                 <Link href={`/contests/${contest.id}/upload`} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 whitespace-nowrap">
                    Join
                 </Link>
             )}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
             <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider font-semibold text-gray-500">
                <Info className="w-3 h-3" /> Description
             </div>
             <p className="mb-3">{contest.description || "No description provided."}</p>
             <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>Ends: {contest.endDate.toLocaleString()}</span>
                {isEnded && <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold ml-2">ENDED</span>}
             </div>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                  { id: 'newest', label: 'Newest' },
                  { id: 'oldest', label: 'Oldest' },
                  { id: 'likes_desc', label: 'Most Liked' },
                  { id: 'likes_asc', label: 'Least Liked' },
                  ...(isEnded ? [{ id: 'trophy', label: 'Trophy 🏆' }] : [])
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
       <ContestFeed
         key={sort}
         initialPosts={posts.map(p => ({...p, isEnded}))}
         contestId={contestId}
         isTrophyView={isTrophyView}
       />
    </div>
  );
}
