import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db as prisma } from '@/lib/db';
import Link from 'next/link';
import InagawaCollapsible from '@/components/InagawaCollapsible';

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
    take: 10,
  });

  // Check if current user is in top 10
  const isCurrentUserInTop10 = leaderboard.some(item => item.userId === session.id);

  // If not in top 10, find their rank
  let currentUserRank: number | null = null;
  if (!isCurrentUserInTop10 && userInagawa) {
    const higherRankingCount = await prisma.inagawa.count({
      where: {
        balance: {
          gt: userInagawa.balance
        }
      }
    });
    currentUserRank = higherRankingCount + 1;
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { username: true, avatarUrl: true }
  });

  // Calculate if today's allowance was given and what it was
  const jstFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });

  const nowJSTStr = jstFormatter.format(new Date());

  const todayRecord = history.find(record => {
    return jstFormatter.format(new Date(record.timestamp)) === nowJSTStr;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center justify-center p-8 bg-card rounded-2xl border border-border shadow-sm text-center space-y-4 h-full">
          <h1 className="text-3xl font-bold text-foreground">あなたのᶘｲ^⇁^ﾅ川</h1>
          <div className="text-6xl">💸</div>
          <p className="text-lg text-muted-foreground">現在の所持金</p>
          <div className={`text-5xl font-black ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {balance}円
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-8 bg-card rounded-2xl border border-border shadow-sm text-center space-y-4 h-full">
          <h2 className="text-2xl font-bold text-foreground">今日のおこづかい</h2>
          <div className="text-6xl">📅</div>
          {todayRecord ? (
            <>
              <p className="text-lg text-muted-foreground">{todayRecord.amount >= 0 ? '獲得' : '没収'}</p>
              <div className={`text-4xl font-black ${todayRecord.amount > 0 ? 'text-green-500' : todayRecord.amount === 0 ? 'text-muted-foreground' : 'text-red-500'}`}>
                {todayRecord.amount > 0 ? `+${todayRecord.amount}` : todayRecord.amount}円
              </div>
            </>
          ) : (
            <>
              <p className="text-lg text-muted-foreground">未受取</p>
              <div className="text-4xl font-black text-muted-foreground">
                ---
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* History */}
        <InagawaCollapsible title={<>📊 収益履歴</>}>
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
                        {new Date(record.timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
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
        </InagawaCollapsible>

        {/* Leaderboard */}
        <InagawaCollapsible title={<>🏆 全体の収益ランキング</>}>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                まだデータがありません。
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {leaderboard.map((item, index) => (
                  <li key={item.id} className={`p-4 flex items-center justify-between hover:bg-muted/50 transition-colors ${item.userId === session.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}>
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

                {currentUserRank && currentUser && userInagawa && (
                  <>
                    <li className="p-1 bg-muted flex justify-center">
                      <span className="text-muted-foreground text-xs font-bold tracking-widest">...</span>
                    </li>
                    <li className="p-4 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20 border-t border-border">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-indigo-500 w-6 text-center">
                          {currentUserRank}
                        </div>
                        <Link href={`/profile/${currentUser.username}`} className="flex items-center gap-2 hover:opacity-80">
                           {currentUser.avatarUrl ? (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img
                               src={currentUser.avatarUrl.startsWith('http') ? `/api/avatar/${currentUser.username}` : currentUser.avatarUrl}
                               alt={currentUser.username}
                               className="w-8 h-8 rounded-full object-cover bg-muted"
                             />
                           ) : (
                             <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                               {currentUser.username[0].toUpperCase()}
                             </div>
                           )}
                           <span className="font-medium text-foreground">{currentUser.username} (あなた)</span>
                        </Link>
                      </div>
                      <div className={`font-bold ${userInagawa.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {userInagawa.balance}円
                      </div>
                    </li>
                  </>
                )}
              </ul>
            )}
          </div>
        </InagawaCollapsible>
      </div>
    </div>
  );
}