import Feed from "@/components/Feed";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { User } from "lucide-react";
import { fetchFeedPosts } from "@/app/actions/post";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const feedType =
    resolvedSearchParams.feed === "following" ? "following" : "all";

  const posts = await fetchFeedPosts({ feedType });

  return (
    <main className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="w-6" /> {/* Spacer */}
          <h1 className="text-xl font-bold tracking-tighter italic">INASTA</h1>
          <Link href="/profile" className="text-gray-700 hover:text-black">
            <User className="w-6 h-6" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex">
          <Link
            href="/?feed=all"
            className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-colors ${
              feedType === "all"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            ALL
          </Link>
          <Link
            href="/?feed=following"
            className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-colors ${
              feedType === "following"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Following
          </Link>
        </div>
      </div>
      {feedType === 'following' && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm">
          <p>まだ誰もフォローしていません。</p>
          <p>他のユーザーをフォローして投稿を見ましょう。</p>
        </div>
      ) : (
        <Feed key={feedType} initialPosts={posts} currentUserId={session.id} feedType={feedType} />
      )}
    </main>
  );
}
