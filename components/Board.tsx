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
  // 2. Move Toolbar to Top Right (Vertical) to avoid Sidebar overlap
  // 3. Move Actions (Undo/Redo) near the toolbar
  // 4. Hide unwanted toolbar items (keeping Select, Hand, Draw, Eraser)
  const customCss = `
    /* Hide Branding */
    .tl-watermark, .tl-powered-by, .tl-watermark_SEE-LICENSE {
      display: none !important;
    }

    /* Move Toolbar Container to Top Right */
    .tlui-toolbar {
        position: fixed !important;
        top: 70px !important; /* Below "Online" badge */
        right: 10px !important;
        bottom: auto !important;
        left: auto !important;
        transform: none !important;
        width: auto !important;
        max-width: none !important;
        z-index: 200 !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        pointer-events: none; /* Let clicks pass through container gaps */
    }

    .tlui-toolbar * {
        pointer-events: auto; /* Re-enable clicks on children */
    }

    /* Inner Layout: Vertical Column */
    .tlui-toolbar__inner {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 8px !important;
        height: auto !important;
        width: auto !important;
        background: transparent !important;
        border: none !important;
    }

    /* Tools Section: Vertical */
    .tlui-toolbar__tools {
        order: 1 !important; /* Tools first (Top) */
        display: flex !important;
        flex-direction: column !important;
        height: auto !important;
        width: auto !important;
        overflow-y: visible !important;
        overflow-x: hidden !important;
        background: var(--color-panel) !important;
        border-radius: 8px !important;
        padding: 4px !important;
        box-shadow: var(--shadow-2) !important;
    }

    /* The Tools List inside tools container */
    .tlui-toolbar__tools__list {
        flex-direction: column !important;
        display: flex !important;
        gap: 4px !important;
    }

    .tlui-button {
        margin: 0 !important;
    }

    /* Extras (Undo/Redo) Section: Vertical below Tools */
    .tlui-toolbar__left {
        order: 2 !important;
        display: flex !important;
        flex-direction: column !important;
        width: auto !important;
    }

    .tlui-toolbar__extras {
        display: flex !important;
        flex-direction: column !important;
        background: var(--color-panel) !important;
        border-radius: 8px !important;
        padding: 4px !important;
        box-shadow: var(--shadow-2) !important;
    }

    .tlui-toolbar__extras__controls {
        flex-direction: column !important;
        display: flex !important;
        gap: 4px !important;
    }

    /* Move Bottom Left UI (Zoom/Page) to Bottom Right to avoid Sidebar FAB */
    .tlui-layout__bottom__left {
      bottom: 10px !important;
      left: auto !important;
      right: 10px !important;
    }

    /* Hide specific tools */
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
            SharePanel: () => null,
        }}
      />
    </div>
  );
}
