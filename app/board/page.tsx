import Board from '@/components/Board';
import { Room } from './Room';
import { CollaborativeApp } from './CollaborativeApp';

export default function BoardPage() {
  return (
    <div className="md:ml-64 h-full relative">
      <Room>
        <div className="absolute top-4 right-4 z-50 bg-white dark:bg-black p-2 rounded shadow border dark:border-gray-800">
           <CollaborativeApp />
        </div>
        <Board />
      </Room>
    </div>
  );
}
