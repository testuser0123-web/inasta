import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDiaryById, toggleDiaryLike, addDiaryComment } from '@/app/actions/diary';
import { DiaryDetailClient } from './DiaryDetailClient';

export default async function DiaryDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();

  const diary = await getDiaryById(parseInt(params.id));

  if (!diary) {
    return <div>Diary not found</div>;
  }

  return (
     <div className="max-w-3xl mx-auto p-4 pb-24">
        <DiaryDetailClient
           diary={diary}
           currentUserId={session?.id}
           toggleLike={toggleDiaryLike}
           addComment={addDiaryComment}
        />
     </div>
  );
}
