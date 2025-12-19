'use client';

import { Tldraw } from 'tldraw';
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

  // Custom CSS to:
  // 1. Hide the Liveblocks watermark and Tldraw branding
  // 2. Move bottom-left UI up
  // 3. Hide unwanted toolbar items (keeping Select, Hand, Draw, Eraser)
  //    The toolbar items usually have data-testid="tools.select", etc.
  //    We want to keep: select, hand, draw, eraser.
  //    We hide others.
  const customCss = `
    .tl-watermark, .tl-powered-by {
      display: none !important;
    }
    .tl-ui-layout__bottom-left {
      bottom: 90px !important;
      left: 10px !important;
    }

    /* Hide specific tools. This is a bit brittle but works without 'toolbar' override support */
    /* Select (arrow), Hand, Draw (pencil), Eraser are usually the first few. */
    /* Let's try to target by data-testid if possible, but we don't know exact IDs without DOM. */
    /* Standard IDs: tools.select, tools.hand, tools.draw, tools.eraser */

    [data-testid="tools.text"],
    [data-testid="tools.asset"],
    [data-testid="tools.note"],
    [data-testid="tools.rectangle"],
    [data-testid="tools.ellipse"],
    [data-testid="tools.triangle"],
    [data-testid="tools.diamond"],
    [data-testid="tools.hexagon"],
    [data-testid="tools.oval"],
    [data-testid="tools.rhombus"],
    [data-testid="tools.star"],
    [data-testid="tools.cloud"],
    [data-testid="tools.heart"],
    [data-testid="tools.x-box"],
    [data-testid="tools.check-box"],
    [data-testid="tools.arrow"],
    [data-testid="tools.line"],
    [data-testid="tools.frame"],
    [data-testid="tools.laser"],
    [data-testid="tools.highlight"] {
      display: none !important;
    }
  `;

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <style>{customCss}</style>
      <Tldraw
        store={storeWithStatus.store}
        autoFocus
        components={{
            SharePanel: () => null, // Remove Share button
            // TopPanel removed from overrides to keep default Menu (Undo/Redo) accessible
        }}
      />
    </div>
  );
}
