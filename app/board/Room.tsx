"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveMap } from "@liveblocks/client";

export function Room({ children }: { children: ReactNode }) {
  const publicKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY || "pk_dev_DF8yGSbEVe_on3bzkv2-QJ9a-EhUKoP5Qke3scCrPcx6kFgrgnzIBU3b-waMQ3DL";

  if (!process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY) {
      console.warn("Using hardcoded Liveblocks public key. Please set NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY in your environment variables.");
  }

  return (
    <LiveblocksProvider publicApiKey={publicKey}>
      <RoomProvider
        id="board-room-v3"
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
