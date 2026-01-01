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
  const currentUserId = session ? session.id : -1;
  const isTrophyView = isEnded && sort === 'trophy';

  let posts: any[] = [];
  try {
    if (isTrophyView) {
        posts = await getContestWinners(contestId);
    } else {
        posts = await fetchContestPosts({ contestId, sortBy: sort });
    }
  } catch (error) {
    console.error("Error fetching contest posts:", error);
    return <div className="text-center p-8 text-gray-500">読み込みに失敗しました</div>;
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
