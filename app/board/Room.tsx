"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveMap } from "@liveblocks/client";

export function Room({ children }: { children: ReactNode }) {
  const publicKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  if (!publicKey) {
      console.error("NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY is missing");
  }

  return (
    <LiveblocksProvider publicApiKey={publicKey!}>
      <RoomProvider
        id="board-room-v1"
        initialStorage={{
            records: new LiveMap(),
        }}
      >
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
