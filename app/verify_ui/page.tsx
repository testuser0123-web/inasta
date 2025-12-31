
import ContestFeed from '@/components/ContestFeed';

export default function VerifyPage() {
    // Mock data matching the actions/contest.ts mock
    const posts = [{
      id: 123,
      imageUrl: 'https://placehold.co/600x400/png',
      comment: 'This is a test post to delete.',
      createdAt: new Date(),
      likesCount: 5,
      hasLiked: false,
      userId: 1,
      user: {
          username: 'myuser',
          avatarUrl: 'https://placehold.co/100x100/png',
          isVerified: true,
          isGold: false,
          updatedAt: new Date()
      },
      images: [],
      isEnded: false
    }];

    return (
        <div className="p-4 bg-white dark:bg-black min-h-screen">
            <h1 className="text-xl font-bold mb-4">Verification Page</h1>
            <ContestFeed
                initialPosts={posts}
                contestId={1}
                currentUserId={1} // Matches post.userId
            />
        </div>
    );
}
