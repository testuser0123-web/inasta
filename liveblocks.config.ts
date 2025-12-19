// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      presence?: any; // TLInstancePresence but type might be complex to import here, using any for simplicity or I should import it?
      // user? : { id: string, color: string, name: string } ?
      // The example uses user.presence.presence
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      records: LiveMap<string, any>; // TLRecord
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        color: string;
        // avatar: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: {};

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {};

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: {};
  }
}

export {};
