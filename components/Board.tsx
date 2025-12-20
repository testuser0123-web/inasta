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
  // 1. Disable body scrolling (fixed, inset 0)
  // 2. Reposition Toolbar to avoid overlapping elements
  // 3. Clean up the toolbar layout
  const customCss = `
    /* Disable body scroll on this page */
    body {
        position: fixed !important;
        top: 0 !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        overflow: hidden !important;
        overscroll-behavior: none !important;
        touch-action: none !important;
    }

    /* Hide Branding */
    .tl-watermark, .tl-powered-by, .tl-watermark_SEE-LICENSE {
      display: none !important;
    }

    /* Toolbar Container */
    /* Mobile: Right Side Vertical to avoid FAB on Left */
    .tlui-toolbar {
        position: fixed !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        left: auto !important;
        right: 12px !important;
        bottom: auto !important;
        width: auto !important;
        max-width: none !important;
        z-index: 200 !important;
        pointer-events: none !important;
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
    }

    /* Desktop: Left Side Vertical (next to sidebar) */
    @media (min-width: 768px) {
        .tlui-toolbar {
            left: 12px !important;
            right: auto !important;
        }
    }

    /* The visual container (Pill) */
    .tlui-toolbar__inner {
        pointer-events: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 8px !important; /* Space between sections */
        height: auto !important;
        width: auto !important;
        background: var(--color-panel) !important;
        border-radius: 8px !important;
        box-shadow: var(--shadow-2) !important;
        padding: 4px !important;
        border: 1px solid var(--color-panel-contrast) !important;
    }

    /* Force tools to stack vertically */
    .tlui-toolbar__tools {
        display: flex !important;
        flex-direction: column !important;
        width: auto !important;
        height: auto !important;
    }

    .tlui-toolbar__tools__list {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
    }

    /* Ensure the Styles panel (if inside toolbar) or buttons behave */
    .tlui-toolbar__tools__mobile {
        display: flex !important;
        flex-direction: column !important;
    }

    .tlui-toolbar__extras {
        display: flex !important;
        flex-direction: column !important;
    }

    .tlui-toolbar__extras__controls {
        display: flex !important;
        flex-direction: column !important;
    }

    /* Fix button margins */
    .tlui-button {
        margin: 0 !important;
        pointer-events: auto !important;
    }

    /* Hide specific tools (simplified set) */
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

    /* Position Zoom/Page Menu (Bottom Left by default, move to avoid FAB) */
    /* FAB is Bottom Left. Let's move this to Bottom Right or Top Left */
    /* On Mobile, FAB is Left. Toolbar is Right. */
    /* Zoom is usually Bottom Left. It conflicts with FAB. */
    .tlui-layout__bottom__left {
        left: auto !important;
        right: 12px !important; /* Move to right (under toolbar?) */
        bottom: 12px !important;
        flex-direction: row !important;
    }

    @media (min-width: 768px) {
        /* Desktop: Sidebar is Left. Toolbar is Left (top). */
        /* Zoom can be Bottom Left (next to sidebar is fine). */
        /* But the container is shifted by md:ml-64. */
        .tlui-layout__bottom__left {
             left: 12px !important;
             right: auto !important;
        }
    }

    /* If Toolbar is Right on Mobile, make sure Zoom doesn't overlap if it's also Right */
    /* Mobile: Toolbar is Right Center. Zoom is Bottom Right. They are far enough apart. */

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
