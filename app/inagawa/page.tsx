import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db as prisma } from '@/lib/db';
import Link from 'next/link';

export const metadata = {
  title: 'おこづかい - INASTA',
};

export default async function InagawaPage() {
  const session = await getSession();
  if (!session?.id) {
    redirect('/login');
  }

  // Fetch current user's inagawa status
  const userInagawa = await prisma.inagawa.findUnique({
    where: { userId: session.id },
  });

  const balance = userInagawa?.balance || 0;

  // Fetch history
  const history = await prisma.inagawaHistory.findMany({
    where: { userId: session.id },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  // Fetch leaderboard
  const leaderboard = await prisma.inagawa.findMany({
    include: {
      user: {
        select: {
          username: true,
          avatarUrl: true,
        }
      }
    },
    orderBy: {
      balance: 'desc',
    },
    take: 50,
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center justify-center p-8 bg-card rounded-2xl border border-border shadow-sm text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">あなたのᶘｲ^⇁^ﾅ川</h1>
        <div className="text-6xl">💸</div>
        <p className="text-lg text-muted-foreground">現在の所持金</p>
        <div className={`text-5xl font-black ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {balance}円
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* History */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            📊 収益履歴
          </h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                まだ履歴がありません。
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {history.map((record) => (
                  <li key={record.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString('ja-JP')}
                      </span>
                      <span className="font-medium text-foreground">{record.message}</span>
                    </div>
                    <div className={`font-bold ${record.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {record.amount > 0 ? `+${record.amount}` : record.amount}円
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🏆 全体の収益ランキング
          </h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                まだデータがありません。
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {leaderboard.map((item, index) => (
                  <li key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-muted-foreground w-6 text-center">
                        {index + 1}
                      </div>
                      <Link href={`/profile/${item.user.username}`} className="flex items-center gap-2 hover:opacity-80">
                         {item.user.avatarUrl ? (
                           // eslint-disable-next-line @next/next/no-img-element
                           <img
                             src={item.user.avatarUrl.startsWith('http') ? `/api/avatar/${item.user.username}` : item.user.avatarUrl}
                             alt={item.user.username}
                             className="w-8 h-8 rounded-full object-cover bg-muted"
                           />
                         ) : (
                           <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                             {item.user.username[0].toUpperCase()}
                           </div>
                         )}
                         <span className="font-medium text-foreground">{item.user.username}</span>
                      </Link>
                    </div>
                    <div className={`font-bold ${item.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {item.balance}円
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}