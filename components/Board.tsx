'use client';

import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { useStorageStore } from './useStorageStore';
import { useSelf } from '@liveblocks/react/suspense';

export default function Board() {
  const id = useSelf((me) => me.id);
  // We can use info from connection or defaults
  // The 'info' property is set when using secret key auth with custom metadata.
  // With public key, we might get random ID and empty info.
  // We can simulate a user info for now.

  // Since we are using public key, Liveblocks generates random IDs.
  // We can just use a random color/name or derive from id.
  const user = {
      id,
      name: id,
      color: 'black' // We can improve this later
  };

  const store = useStorageStore({
      user
  });

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <Tldraw
        store={store}
        autoFocus
      />
    </div>
  );
}
