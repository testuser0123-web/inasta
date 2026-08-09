import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDiaryById } from '@/app/actions/diary';
import EditDiaryClient from './EditDiaryClient';

export default async function EditDiaryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const diary = await getDiaryById(parseInt(params.id));

  if (!diary) {
    redirect('/diary');
  }

  if (diary.userId !== session.id) {
    redirect(`/diary/${diary.id}`);
  }

  return (
    <EditDiaryClient
      diary={{
        id: diary.id,
        title: diary.title,
        content: diary.content,
        thumbnailUrl: diary.thumbnailUrl,
        date: diary.date,
        userId: diary.userId,
      }}
    />
  );
}
