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
  // 3. Merge Styles, Undo/Redo, and Tools into one vertical pill
  // 4. Fix touch sensitivity by managing pointer-events properly
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
        pointer-events: none !important; /* Allow clicks pass through outside the pill */
    }

    /* The visual container (Pill) */
    .tlui-toolbar__inner {
        pointer-events: auto !important; /* Enable clicks inside */
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 0 !important; /* No gaps between sections */
        height: auto !important;
        width: auto !important;

        /* Unified Look */
        background: var(--color-panel) !important;
        border-radius: 8px !important;
        box-shadow: var(--shadow-2) !important;
        padding: 4px !important;
        border: 1px solid var(--color-panel-contrast) !important; /* Optional border */
    }

    /* Styles Button Section (Order 1) */
    /* This targets the Styles container (which is a tlui-toolbar__tools sibling of Left) */
    .tlui-toolbar > .tlui-toolbar__inner > .tlui-toolbar__tools {
        order: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        background: transparent !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin-bottom: 4px !important; /* Small gap between Styles and Undo? or 0? */
        /* Let's keep a small divider or just 0 */
        margin: 0 !important;
        border-bottom: 1px solid var(--color-divider, #e0e0e0) !important; /* Separator */
        width: 100% !important;
        align-items: center !important;
        padding-bottom: 4px !important;
        margin-bottom: 4px !important;
    }

    /* Left Section (Order 2) - Contains Extras and ToolsMobile */
    .tlui-toolbar__left {
        order: 2 !important;
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        align-items: center !important;
        gap: 4px !important;
    }

    /* Extras (Undo/Redo) */
    .tlui-toolbar__extras {
        display: flex !important;
        flex-direction: column !important;
        background: transparent !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        align-items: center !important;

        /* Separator below Extras? */
        border-bottom: 1px solid var(--color-divider, #e0e0e0) !important;
        padding-bottom: 4px !important;
        margin-bottom: 4px !important;
    }

    .tlui-toolbar__extras__controls {
        flex-direction: column !important;
        display: flex !important;
        gap: 4px !important;
    }

    /* Tools Mobile (Select, Hand, etc) */
    .tlui-toolbar__tools__mobile {
        display: flex !important;
        flex-direction: column !important;
        background: transparent !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        align-items: center !important;
    }

    .tlui-toolbar__tools__list {
        flex-direction: column !important;
        display: flex !important;
        gap: 4px !important;
    }

    .tlui-button {
        margin: 0 !important;
    }

    /* Remove padding/margin/shadow from generic tools class to avoid double styling */
    .tlui-toolbar__tools {
        /* This selector targets BOTH Styles container and ToolsMobile container. */
        /* But above we targeted the direct child of inner for Styles. */
        /* And ToolsMobile overrides might need specificity. */
        /* Let's ensure no conflict. */
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

    /* Move Bottom Left UI (Zoom/Page) to Bottom Right to avoid Sidebar FAB */
    .tlui-layout__bottom__left {
      bottom: 10px !important;
      left: auto !important;
      right: 10px !important;
      pointer-events: auto !important;
    }

    /* Fix for touch sensitivity: Ensure buttons and children receive events */
    .tlui-button, .tlui-icon {
        pointer-events: auto !important;
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
