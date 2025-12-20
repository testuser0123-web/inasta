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

  // Custom CSS to fix layout issues on Mobile and Desktop
  const customCss = `
    /* Disable body scroll on this page to prevent bounce */
    body {
        overscroll-behavior: none !important;
        touch-action: none !important;
    }

    /* Hide Branding */
    .tl-watermark, .tl-powered-by, .tl-watermark_SEE-LICENSE {
      display: none !important;
    }

    /*
       FORCE ABSOLUTE POSITIONING AND SIZE
       Critical to ensure Tldraw UI renders inside the relative container correctly.
    */
    .tldraw-ui, .tlui-layout {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        pointer-events: none !important; /* Pass clicks through to canvas where no UI exists */
    }

    /* TOOLBAR POSITIONING */
    .tlui-toolbar {
        position: absolute !important;
        z-index: 200 !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: auto !important;
        max-width: none !important;
        pointer-events: none !important;
        display: flex !important; /* Ensure visibility */
    }

    /* Toolbar Content */
    .tlui-toolbar__inner {
        pointer-events: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 8px !important;
        height: auto !important;
        width: auto !important;
        background: var(--color-panel) !important;
        border-radius: 8px !important;
        box-shadow: var(--shadow-2) !important;
        padding: 4px !important;
        border: 1px solid var(--color-panel-contrast) !important;
    }

    .tlui-toolbar__tools, .tlui-toolbar__tools__list, .tlui-toolbar__extras, .tlui-toolbar__extras__controls {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
    }

    .tlui-toolbar__tools__mobile {
         display: flex !important;
         flex-direction: column !important;
    }

    /* MOBILE LAYOUT (max-width: 767px) */
    @media (max-width: 767px) {
        /* Toolbar: Right Side Vertical */
        .tlui-toolbar {
            left: auto !important;
            right: 12px !important;
            bottom: auto !important;
        }

        /* Bottom Left (Zoom/Help): Move to Top Left or Bottom Right to avoid FAB (Bottom Left) */
        .tlui-layout__bottom__left {
            position: absolute !important;
            left: auto !important;
            right: 12px !important;
            bottom: 60px !important; /* Above Liveblocks/other items */
            flex-direction: row-reverse !important;
            pointer-events: auto !important;
        }

        /* Ensure Page Menu is accessible */
        .tlui-layout__top__left {
            top: 12px !important;
            left: 12px !important;
            pointer-events: auto !important;
        }
    }

    /* DESKTOP LAYOUT (min-width: 768px) */
    @media (min-width: 768px) {
        /* Toolbar: Left Side Vertical (inside container) */
        .tlui-toolbar {
            left: 12px !important;
            right: auto !important;
        }

        /* Bottom Left (Zoom/Help) */
        .tlui-layout__bottom__left {
            position: absolute !important;
            left: 12px !important;
            right: auto !important;
            bottom: 12px !important;
            pointer-events: auto !important;
        }
    }

    .tlui-button {
        margin: 0 !important;
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
            // Re-enable all tools to ensure toolbar is not empty
            // We can refine this later if user explicitly asked to hide specific tools.
            // For now, I'm removing the aggressive tool hiding to ensure basic tools are visible.
        }}
        // Use overrides to hide specific tools if needed, cleaner than CSS
        overrides={{
           tools(editor, tools) {
               // If we wanted to hide tools, we would do:
               // delete tools.card;
               // But let's keep them default for now to fix the "missing toolbar" issue.
               return tools;
           }
        }}
      />
    </div>
  );
}
