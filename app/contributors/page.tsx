import { db } from '@/lib/db';
import Link from 'next/link';
import { enrichUser } from '@/lib/user_logic';

export const dynamic = 'force-dynamic';

export default async function ContributorsPage() {
  const contributors = await db.user.findMany({
    where: {
      subscriptionAmount: {
        gt: 0,
      },
    },
    orderBy: {
      subscriptionAmount: 'desc',
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      subscriptionAmount: true,
      subscriptionExpiresAt: true,
      isVerified: true,
      isGold: true,
      updatedAt: true,
      roles: true,
    },
  });

  return (
    <main className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 pb-20 md:pb-0">
       <div className="sticky top-0 z-40 bg-white dark:bg-black border-b dark:border-gray-800 px-4 py-3 flex items-center shadow-sm">
         {/* Placeholder for mobile sidebar toggle alignment if needed, usually managed by LayoutShell/Sidebar component z-index */}
         <div className="w-8 md:hidden"></div>
         <h1 className="text-lg font-bold flex-1 text-center md:text-left">貢献者一覧</h1>
         <div className="w-8 md:hidden"></div>
      </div>

      <div className="max-w-2xl mx-auto py-6 px-4">
        <p className="mb-6 text-gray-600 dark:text-gray-400 text-center md:text-left">
            システム維持費のためにカンパしてくださった方々です。ありがとうございます！
        </p>

        <div className="space-y-4">
            {contributors.map(rawUser => {
                const user = enrichUser(rawUser);
                return (
                    <Link key={user.id} href={`/users/${user.username}`} className="block">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                    {user.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `/api/avatar/${user.username}?v=${user.updatedAt.getTime()}`}
                                            alt={user.username}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                            {user.username[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="font-bold">@{user.username}</div>
                            </div>
                            <div className="font-mono font-bold text-green-600 dark:text-green-400">
                                ¥{user.subscriptionAmount?.toLocaleString()}
                            </div>
                        </div>
                    </Link>
                );
            })}

            {contributors.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    まだ貢献者はいません。
                </div>
            )}
        </div>
      </div>
    </main>
  );
}
