import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function AdminInboxPage() {
  const session = await getSession();

  // Developer access check
  const adminId = process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID, 10) : null;

  if (!session || !adminId || session.id !== adminId) {
    notFound(); // Or redirect to home
  }

  const suggestions = await db.suggestion.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-3xl">📬</span>
        開発者用受信箱
      </h1>

      <div className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border dark:border-gray-800 text-center text-gray-500">
            まだ投書はありません。
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                     {suggestion.user.avatarUrl ? (
                        <img
                          src={`/api/avatar/${suggestion.user.username}`}
                          alt={suggestion.user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                          {suggestion.user.username[0].toUpperCase()}
                        </div>
                      )}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{suggestion.user.username}</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(suggestion.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-500">
                  ID: {suggestion.id}
                </div>
              </div>

              <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-950/50 p-4 rounded-md">
                {suggestion.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
