import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DiaryList } from './DiaryList';
import { getDiariesByDate, checkHasPostedToday } from '@/app/actions/diary';

export default async function DiaryPage(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const dateParam = searchParams.date || new Date().toISOString().split('T')[0];
  const diaries = await getDiariesByDate(dateParam);
  const hasPostedToday = await checkHasPostedToday(session.id, new Date().toISOString().split('T')[0]);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <h1 className="text-3xl font-bold mb-6">Diary</h1>
      <DiaryList
        dateParam={dateParam}
        currentUserId={session.id}
        diaries={diaries}
        hasPostedToday={hasPostedToday}
      />
    </div>
  );
}
