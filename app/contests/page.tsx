import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Suspense } from 'react';
import ContestList from '@/components/ContestList';
import { Spinner } from '@/components/ui/spinner';

export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth';

export default async function ContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams.tab === 'ended' ? 'ended' : 'active';
  const session = await getSession();

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Enforce fixed height of 57px (h-14 is 56px + 1px border maybe?)
          Actually, standard iOS navbar is often 44px or 50px.
          Let's use h-[57px] to match typical 32px button + 12px padding top/bottom + 1px border = ~57px.
          But to be safe and consistent, we use h-14 (3.5rem = 56px) and flex items-center.
      */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b dark:border-gray-800 shadow-sm px-4 h-14 flex items-center justify-between">
        <div className="w-12 md:hidden" /> {/* Hamburger spacer */}
        <h1 className="text-xl font-bold dark:text-white absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">コンテスト</h1>
        <div className="flex items-center justify-end w-20">
            {tab === 'active' && session?.username !== 'guest' && (
                <Link href="/contests/create" className="bg-indigo-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-indigo-700 flex items-center gap-1 z-10">
                    <Plus className="w-4 h-4" /> 作成
                </Link>
            )}
        </div>
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

      <Suspense key={tab} fallback={<Spinner />}>
        <ContestList tab={tab} />
      </Suspense>
    </div>
  );
}
