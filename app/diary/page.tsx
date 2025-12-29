import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DiaryList } from './DiaryList';
import { getDiariesForRange, getPostedDiaryDates, checkHasPostedToday } from '@/app/actions/diary';
import { Book } from 'lucide-react';

export default async function DiaryPage(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getSession();
  const currentUserId = session ? session.id : -1;

  // No redirect for guests
  // if (!session) {
  //   redirect('/login');
  // }

  const dateParam = searchParams.date || new Date().toISOString().split('T')[0];
  const diaries = await getDiariesForRange(dateParam);
  const postedDates = await getPostedDiaryDates();

  // If guest, they haven't posted today (and can't)
  const hasPostedToday = session ? await checkHasPostedToday(session.id, new Date().toISOString().split('T')[0]) : false;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <header className="relative mb-8 overflow-hidden rounded-2xl bg-primary p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-black/10 blur-3xl"></div>

        <div className="relative z-10 flex items-center gap-6">
          <div className="rounded-xl bg-white/20 p-4 backdrop-blur-sm shadow-inner ring-1 ring-white/30">
            <Book className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm sm:text-4xl">Diary</h1>
            <p className="mt-2 text-white/90 font-medium text-lg opacity-90">
              日々の思い出を記録しよう
            </p>
          </div>
        </div>
      </header>
      <DiaryList
        dateParam={dateParam}
        currentUserId={currentUserId}
        diaries={diaries}
        postedDates={postedDates}
        hasPostedToday={hasPostedToday}
      />
    </div>
  );
}
