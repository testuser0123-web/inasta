import Board from '@/components/Board';
import { Room } from './Room';
import { CollaborativeApp } from './CollaborativeApp';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function BoardPage() {
  return (
    <div className="md:ml-64 h-full relative">
      {/* Mobile "Back to Home" Button - Replaces the Sidebar FAB */}
      <Link
        href="/"
        className="md:hidden fixed bottom-6 left-6 z-[300] p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      >
        <Home className="w-6 h-6" />
      </Link>

      <Room>
        <div className="absolute top-4 right-4 z-50 bg-white dark:bg-black p-2 rounded shadow border dark:border-gray-800">
           <CollaborativeApp />
        </div>
        <Board />
      </Room>
    </div>
  );
}
