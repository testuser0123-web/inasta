import { fetchContestPosts, getContestWinners } from '@/app/actions/contest';
import ContestFeed from '@/components/ContestFeed';
import { getSession } from '@/lib/auth';

export default async function ContestPostsFetcher({
    contestId,
    sort,
    isEnded
}: {
    contestId: number,
    sort: string,
    isEnded: boolean
}) {
  const session = await getSession();
  const currentUserId = session ? String(session.id) : undefined;
  const isTrophyView = isEnded && sort === 'trophy';

  let posts: any[] = [];
  let error = null;

  try {
      if (isTrophyView) {
          posts = await getContestWinners(contestId);
      } else {
          posts = await fetchContestPosts({ contestId, sortBy: sort });
      }
  } catch (e) {
      console.error('Error fetching contest posts:', e);
      error = '投稿の読み込みに失敗しました。';
  }

  if (error) {
      return (
          <div className="text-center py-12 text-red-500">
              {error}
          </div>
      );
  }

  return (
       <ContestFeed
         initialPosts={posts.map(p => ({...p, isEnded}))}
         contestId={contestId}
         isTrophyView={isTrophyView}
         currentUserId={currentUserId}
       />
  );
}
