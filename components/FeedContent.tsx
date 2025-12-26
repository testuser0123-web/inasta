import { fetchFeedPosts } from "@/app/actions/post";
import Feed from "@/components/Feed";
import { getSession } from "@/lib/auth";

export default async function FeedContent({
    feedType,
    searchQuery
}: {
    feedType: "all" | "following" | "search",
    searchQuery: string
}) {
    const session = await getSession();
    // Assuming session exists because the parent checks it, but good to be safe or pass userId as prop
    // However, Feed needs currentUserId.
    if (!session) return null;

    const posts = await fetchFeedPosts({ feedType, searchQuery });

    const isGuest = session.username === 'guest';

    if (feedType === 'following' && posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm">
                <p>まだ誰もフォローしていません。</p>
                <p>他のユーザーをフォローして投稿を見ましょう。</p>
            </div>
        );
    }

    if (feedType === 'search' && searchQuery && posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm">
                <p>No posts found for &quot;{searchQuery}&quot;</p>
            </div>
        );
    }

    return (
        <Feed
            initialPosts={posts}
            currentUserId={session.id}
            feedType={feedType}
            searchQuery={searchQuery}
            isGuest={isGuest}
        />
    );
}
