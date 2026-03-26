import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db as prisma } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import InagawaChart from '@/components/InagawaChart';

export const metadata = {
  title: 'おこづかいグラフ - INASTA',
};

export default async function InagawaChartPage() {
  const session = await getSession();
  if (!session?.id) {
    redirect('/login');
  }

  const userInagawa = await prisma.inagawa.findUnique({
    where: { userId: session.id },
  });

  if (!userInagawa) {
    redirect('/inagawa');
  }

  const balance = userInagawa.balance || 0;

  const history = await prisma.inagawaHistory.findMany({
    where: { userId: session.id },
    orderBy: { timestamp: 'asc' }, // The chart component might prefer asc or desc, but let's pass it anyway
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 md:pb-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/inagawa" className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-foreground" />
        </Link>
        <h1 className="text-3xl font-bold text-foreground">おこづかいグラフ</h1>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 md:p-8">
        <InagawaChart currentBalance={balance} history={history} />
      </div>
    </div>
  );
}
