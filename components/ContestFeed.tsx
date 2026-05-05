'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart, Loader2, Share2, AlertTriangle, Layers, X, ChevronLeft, ChevronRight, BadgeCheck, User as UserIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { toggleContestLike, deleteContestPost } from '@/app/actions/contest';
import { Spinner } from '@/components/ui/spinner';
import { ImageWithSpinner } from '@/components/ImageWithSpinner';

type ContestPost = {
    id: number;
    imageUrl: string;
    comment: string | null;
    createdAt: Date;
    likesCount: number;
    hasLiked: boolean;
    userId: number;
    user: {
        username: string;
        avatarUrl: string | null;
        isVerified?: boolean;
        isGold?: boolean;
    };
    images?: { id: number; url: string; order: number }[];
    isEnded: boolean;
};

export default function ContestFeed({ initialPosts, contestId, isTrophyView = false, currentUserId }: { initialPosts: ContestPost[], contestId: number, isTrophyView?: boolean, currentUserId?: number }) {
    const [posts, setPosts] = useState(initialPosts);
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const openedViaNav = useRef(false);
    const pendingOpenPostId = useRef<number | null>(null);
    const pendingClose = useRef(false);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const postsRef = useRef(posts);
    postsRef.current = posts;

    // Guest check
    const isGuest = !currentUserId || currentUserId === -1;

    // Sync from URL and handle App Router-driven URL updates. Read window.location
    // inside the effect so stale useSearchParams snapshots cannot close a just-opened modal.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search || searchParams.toString());
        const postIdParam = params.get('postId');
        if (postIdParam) {
            const id = parseInt(postIdParam, 10);
            if (!isNaN(id)) {
                // Ignore stale URL snapshots while a close navigation is still settling.
                if (pendingClose.current || (pendingOpenPostId.current !== null && pendingOpenPostId.current !== id)) {
                    return;
                }

                const postExists = posts.some(p => p.id === id);
                if (postExists) {
                    pendingOpenPostId.current = null;
                    pendingClose.current = false;
                    setSelectedPostId(id);
                    return;
                }
            }
        }

        pendingOpenPostId.current = null;
        pendingClose.current = false;
        openedViaNav.current = false;
        setSelectedPostId(null);
    }, [searchParams, posts]);

    // Browser/device back-forward navigation happens outside React event handlers.
    // Keep the modal state aligned with the real URL so a hardware back action
    // consumes the modal history entry instead of navigating away from the site.
    useEffect(() => {
        const handlePopState = () => {
            pendingOpenPostId.current = null;
            pendingClose.current = false;

            const params = new URLSearchParams(window.location.search);
            const postIdParam = params.get('postId');
            if (postIdParam) {
                const id = parseInt(postIdParam, 10);
                if (!isNaN(id) && postsRef.current.some(p => p.id === id)) {
                    setSelectedPostId(id);
                    return;
                }
            }

            openedViaNav.current = false;
            setSelectedPostId(null);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;

    const handlePostClick = (postId: number) => {
        // Reserve the modal history entry synchronously before showing the modal.
        // This makes hardware/browser back immediately close the modal instead of
        // consuming the previous page entry while App Router navigation is settling.
        pendingClose.current = false;
        pendingOpenPostId.current = postId;

        const params = new URLSearchParams(window.location.search || searchParams.toString());
        params.set('postId', postId.toString());
        const newUrl = `${pathname}?${params.toString()}`;
        window.history.pushState({ postId }, '', newUrl);
        openedViaNav.current = true;
        setSelectedPostId(postId);
    };

    const handleCloseModal = () => {
        pendingClose.current = true;
        pendingOpenPostId.current = null;
        setSelectedPostId(null);

        if (openedViaNav.current) {
            openedViaNav.current = false;
            window.history.back();
        } else {
            const params = new URLSearchParams(window.location.search || searchParams.toString());
            params.delete('postId');
            const newUrl = `${pathname}${params.toString() ? '?' + params.toString() : ''}`;
            window.history.replaceState(null, '', newUrl);
        }
    };

    const handleLike = async (post: ContestPost) => {
        if (isGuest) {
            alert("いいね機能を使用するにはログインが必要です。");
            return;
        }
        if (post.isEnded) return;

        setPosts(current => current.map(p =>
            p.id === post.id
                ? { ...p, likesCount: p.hasLiked ? p.likesCount - 1 : p.likesCount + 1, hasLiked: !p.hasLiked }
                : p
        ));

        await toggleContestLike(post.id);
    };

    const handleDelete = async (postId: number) => {
        if (!confirm('本当に削除しますか？')) return;
        setIsDeleting(true);
        try {
            const result = await deleteContestPost(postId);
            if (result.success) {
                setPosts(current => current.filter(p => p.id !== postId));
                handleCloseModal();
            } else {
                alert(result.message);
            }
        } catch (e) {
            alert('エラーが発生しました');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="pb-20">
            {isTrophyView ? (
                 <div className="space-y-8 p-4">
                    {posts.map((post, index) => (
                        <div key={post.id} className="relative bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg border-2 border-yellow-500/20">
                            {/* Rank Badge */}
                            <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur text-white px-4 py-2 rounded-full font-bold text-lg flex items-center gap-2 border border-white/20">
                                <span>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                                <span>#{index + 1}</span>
                            </div>

                            <div className="aspect-square cursor-pointer" onClick={() => handlePostClick(post.id)}>
                                 <ImageWithSpinner src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>

                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {post.user.avatarUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={post.user.avatarUrl} alt={post.user.username} crossOrigin="anonymous" className="w-8 h-8 rounded-full object-cover" />
                                        )}
                                        <span className="font-bold">@{post.user.username}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                                        <span>{post.likesCount}</span>
                                    </div>
                                </div>
                                {post.comment && <p className="text-sm text-gray-700 dark:text-gray-300">{post.comment}</p>}
                            </div>
                        </div>
                    ))}
                 </div>
            ) : (
                <div className="grid grid-cols-3 gap-0.5">
                    {posts.map((post) => (
                        <div key={post.id} onClick={() => handlePostClick(post.id)} className="aspect-square relative cursor-pointer bg-gray-100 dark:bg-gray-800">
                             <ImageWithSpinner src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                             {post.images && post.images.length > 0 && (
                                <div className="absolute top-2 right-2 z-10"><Layers className="w-5 h-5 text-white drop-shadow-md" /></div>
                             )}
                        </div>
                    ))}
                </div>
            )}

            {/* Post Modal */}
            {selectedPost && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={handleCloseModal}>
                     <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden w-full max-w-sm relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={handleCloseModal} className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-white z-10 hover:bg-black/40"><X className="w-5 h-5" /></button>

                        <div className="w-full relative bg-gray-100 dark:bg-gray-800 min-h-[200px] shrink-0">
                             {/* Simplified Slider for Contest Post */}
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src={selectedPost.imageUrl} alt="" className="w-full h-auto max-h-[50vh] object-contain mx-auto" />
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 dark:text-gray-100">
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                     <button
                                        onClick={() => handleLike(selectedPost)}
                                        disabled={selectedPost.isEnded && !isGuest}
                                        className={`flex items-center gap-1.5 transition-colors group ${isGuest ? 'cursor-not-allowed opacity-50' : ''}`}
                                     >
                                         <Heart className={`w-6 h-6 transition-colors ${selectedPost.hasLiked ? 'fill-red-500 text-red-500' : 'text-gray-700 dark:text-gray-300 group-hover:text-red-500'}`} />
                                         <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedPost.likesCount}</span>
                                     </button>
                                     {selectedPost.user && (
                                         <Link href={`/users/${selectedPost.user.username}`} className="flex items-center gap-2 hover:opacity-80">
                                             <span className="font-bold text-sm">@{selectedPost.user.username}</span>
                                             {selectedPost.user.isGold && <BadgeCheck className="w-4 h-4 text-yellow-500" />}
                                         </Link>
                                     )}
                                </div>
                                {currentUserId === selectedPost.userId && (
                                    <button
                                        onClick={() => handleDelete(selectedPost.id)}
                                        disabled={isDeleting}
                                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                        title="削除"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                             </div>
                             {selectedPost.comment && <p className="text-gray-900 dark:text-gray-100 break-words mb-2">{selectedPost.comment}</p>}
                             <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(selectedPost.createdAt).toLocaleString()}
                             </div>
                        </div>
                     </div>
                 </div>
            )}
        </div>
    );
}
