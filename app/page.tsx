import { getSession } from "@/lib/auth";
import Link from "next/link";
import { User, Search } from "lucide-react";
import FeedContent from "@/components/FeedContent";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import Snowfall from "@/components/Snowfall";
import { db } from "@/lib/db";
import QuickNav from "@/components/QuickNav";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string; q?: string }>;
}) {
  const session = await getSession();

  let showQuickNav = false;
  if (session) {
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { showMobileQuickNav: true },
    });
    showQuickNav = user?.showMobileQuickNav ?? false;
  }

  const resolvedSearchParams = await searchParams;
  let feedType: "all" | "following" | "search" = "all";
  if (resolvedSearchParams.feed === "following") {
    feedType = "following";
  } else if (resolvedSearchParams.feed === "search") {
    feedType = "search";
  }

  // Restrict guest from accessing 'following' feed
  if (!session && feedType === 'following') {
    feedType = 'all';
  }

  const searchQuery = resolvedSearchParams.q || "";

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      {process.env.SNOWFALL === 'true' && <Snowfall />}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b dark:border-gray-800 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="w-6" /> {/* Spacer */}
          <div className="h-6 w-auto">
            <img
              src="/logo.png"
              alt="INASTA"
              className="h-full w-auto block dark:hidden"
            />
            <img
              src="/logo-inverted.png"
              alt="INASTA"
              className="hidden h-full w-auto dark:block"
            />
          </div>
          {session ? (
            <Link href="/profile" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white">
              <User className="w-6 h-6" />
            </Link>
          ) : (
             <div className="w-6" /> // Spacer if guest
          )}
        </div>

        {/* Quick Nav (Mobile Only, Enabled by User) */}
        {showQuickNav && <QuickNav />}

        {/* Tabs */}
        <div className="flex">
          <Link
            href="/?feed=all"
            className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-colors ${
              feedType === "all"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            すべて
          </Link>
          {session && (
            <Link
                href="/?feed=following"
                className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-colors ${
                feedType === "following"
                    ? "border-black dark:border-white text-black dark:text-white"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
            >
                フォロー
            </Link>
          )}
          <Link
            href="/?feed=search"
            className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-colors flex justify-center items-center gap-1 ${
              feedType === "search"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Search className="w-4 h-4" />
            検索
          </Link>
        </div>
      </div>

      {feedType === 'search' && (
        <div className="p-4 border-b dark:border-gray-800">
          <form action="/" method="GET" className="relative">
            <input type="hidden" name="feed" value="search" />
            <div className="relative">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="タグやユーザーを検索..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            </div>
          </form>
        </div>
      )}

      <Suspense key={`${feedType}-${searchQuery}`} fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
        <FeedContent feedType={feedType} searchQuery={searchQuery} />
      </Suspense>
    </main>
  );
}
