import Feed from '@/components/Feed';

export default function VerifyReplyPage() {
    const posts = [{
        id: 123,
        imageUrl: 'https://placehold.co/600x400/png',
        comment: 'This is a test post for replying.',
        createdAt: new Date(),
        likesCount: 5,
        hasLiked: false,
        userId: 2,
        user: {
            username: 'original_poster',
            avatarUrl: 'https://placehold.co/100x100/png',
            isVerified: true,
            isGold: false,
            updatedAt: new Date()
        },
        images: [],
        comments: [
            {
                id: 1,
                text: 'This is a great post!',
                createdAt: new Date(),
                userId: 3,
                user: {
                    username: 'commenter',
                    avatarUrl: 'https://placehold.co/100x100/png'
                }
            }
        ]
    }];

    return (
        <div className="p-4 bg-white dark:bg-black min-h-screen">
            <h1 className="text-xl font-bold mb-4">Verification Page - Reply</h1>
            <Feed
                initialPosts={posts as any}
                currentUserId={1} // Different user
            />
        </div>
    );
}
