'use client';

import { Tldraw, TldrawUiOverrides } from 'tldraw';
import 'tldraw/tldraw.css';
import { useStorageStore } from './useStorageStore';
import { useSelf } from '@liveblocks/react/suspense';
import { Spinner } from '@/components/ui/spinner';
import { useMemo } from 'react';

export default function Board() {
  const id = useSelf((me) => me.id);

  // Memoize user object to prevent infinite re-renders in useStorageStore
  const user = useMemo(() => ({
      id,
      name: id,
      color: 'black'
  }), [id]);

  const storeWithStatus = useStorageStore({
      user
  });

  const { status } = storeWithStatus;

  // Define overrides using useMemo to prevent unnecessary re-renders
  const overrides: TldrawUiOverrides = useMemo(() => ({
    toolbar(_app, toolbar, { tools }) {
      // Keep only minimal tools: Select, Hand, Draw (Pen), Eraser
      const keep = ['select', 'hand', 'draw', 'eraser'];
      return toolbar.filter((item) => keep.includes(item.id));
    },
  }), []);

  if (status === 'loading') {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
        <p className="text-red-500">Error: {(storeWithStatus as any).error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  // Custom CSS to fix mobile overlap and hide watermark
  // Moving .tl-ui-layout__bottom-left up to avoid Sidebar FAB (bottom-6 left-6)
  const customCss = `
    .tl-watermark, .tl-powered-by {
      display: none !important;
    }
    .tl-ui-layout__bottom-left {
      bottom: 90px !important;
      left: 10px !important;
    }
  `;

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <style>{customCss}</style>
      <Tldraw
        store={storeWithStatus.store}
        autoFocus
        overrides={overrides}
        components={{
            SharePanel: () => null, // Remove Share button
            TopPanel: () => null, // Optional: reduce clutter
        }}
      />
    </div>
  );
}
