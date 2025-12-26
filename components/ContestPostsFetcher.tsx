import { fetchContestPosts, getContestWinners } from '@/app/actions/contest';
import ContestFeed from '@/components/ContestFeed';

export default async function ContestPostsFetcher({
  contestId,
  sort,
  isEnded,
  isGuest
}: {
  contestId: number;
  sort: string;
  isEnded?: boolean;
  isGuest?: boolean;
}) {
  let posts = [];

  if (sort === 'trophy' && isEnded) {
      posts = await getContestWinners(contestId);
      // Assign ranks
      posts = posts.map((p, i) => ({ ...p, rank: i + 1 }));
  } else {
      posts = await fetchContestPosts({ contestId, sortBy: sort });
  }

  if (posts.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <p>投稿がありません</p>
          </div>
      );
  }

  return <ContestFeed posts={posts} isEnded={isEnded} isGuest={isGuest} />;
}
