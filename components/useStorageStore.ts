import { useEffect, useState, useRef } from "react";
import { useRoom } from "@liveblocks/react/suspense";
// LiveMap is used in type definition, but implicitly via liveblocks.config.ts global augmentation?
// No, it is imported here but not used in code body, only in type logic or inferred.
// Actually, `root.get("records")` returns a LiveMap.
import {
  computed,
  createPresenceStateDerivation,
  createTLStore,
  react,
  defaultShapeUtils,
  DocumentRecordType,
  InstancePresenceRecordType,
  PageRecordType,
  TLDocument,
  TLInstancePresence,
  TLPageId,
  TLRecord,
  TLStoreEventInfo,
  TLStoreWithStatus,
  IndexKey,
} from "tldraw";

export function useStorageStore({
  shapeUtils = [],
  user,
}: Partial<{
  hostUrl: string;
  version: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shapeUtils: any[];
  user: {
    id: string;
    color: string;
    name: string;
  };
}>) {
  // Get Liveblocks room
  const room = useRoom();

  // Set up tldraw store and status
  const [store] = useState(() => {
    const store = createTLStore({
      shapeUtils: [...defaultShapeUtils, ...shapeUtils],
    });
    return store;
  });

  const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
    status: "loading",
  });

  // Flag to prevent infinite loops
  const isApplyingRemoteChanges = useRef(false);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setStoreWithStatus({ status: "loading" });

    async function setup() {
      // Get Liveblocks Storage values
      let root;
      try {
          const storage = await room.getStorage();
          root = storage.root;
      } catch (e) {
          console.error("Failed to get storage", e);
          setStoreWithStatus({ status: "error", error: e as Error }); // Show error status
          return;
      }

      // Ensure records LiveMap exists
      const liveRecords = root.get("records");
      if (!liveRecords) {
        // This should be handled by initialStorage, but safe check
        console.warn("LiveRecords not found in storage");
        // If we can't find it, we can't sync.
        // We could try to create it if we have permission?
        // But for now, just return or error.
        // If we return, status stays "loading", which explains spinner.
        // But if Room.tsx set it, it should be there.
        // Maybe wait?
        // I will return for now but log error.
        console.error("LiveRecords missing!");
        setStoreWithStatus({ status: "error", error: new Error("LiveRecords missing") });
        return;
      }

      // Initialize tldraw with records from Storage
      store.clear();
      store.put(
        [
          DocumentRecordType.create({
            id: "document:document" as TLDocument["id"],
          }),
          PageRecordType.create({
            id: "page:page" as TLPageId,
            name: "Page 1",
            index: "a1" as IndexKey,
          }),
          ...[...liveRecords.values()],
        ],
        "initialize"
      );

      // Sync tldraw changes with Storage
      unsubs.push(
        store.listen(
          ({ changes, source }: TLStoreEventInfo) => {
            if (source !== "user") return;
            if (isApplyingRemoteChanges.current) return; // Explicit guard

            room.batch(() => {
              Object.values(changes.added).forEach((record) => {
                liveRecords.set(record.id, record);
              });

              Object.values(changes.updated).forEach(([, record]) => {
                liveRecords.set(record.id, record);
              });

              Object.values(changes.removed).forEach((record) => {
                liveRecords.delete(record.id);
              });
            });
          },
          { source: "user", scope: "document" }
        )
      );

      // Sync tldraw changes with Presence
      function syncStoreWithPresence({ changes, source }: TLStoreEventInfo) {
        if (source !== "user") return;
        if (isApplyingRemoteChanges.current) return;

        room.batch(() => {
          Object.values(changes.added).forEach((record) => {
            room.updatePresence({ [record.id]: record });
          });

          Object.values(changes.updated).forEach(([, record]) => {
            room.updatePresence({ [record.id]: record });
          });

          Object.values(changes.removed).forEach((record) => {
            room.updatePresence({ [record.id]: null });
          });
        });
      }

      unsubs.push(
        store.listen(syncStoreWithPresence, {
          source: "user",
          scope: "session",
        })
      );

      unsubs.push(
        store.listen(syncStoreWithPresence, {
          source: "user",
          scope: "presence",
        })
      );

      // Update tldraw when Storage changes
      unsubs.push(
        room.subscribe(
          liveRecords,
          (storageChanges) => {
            isApplyingRemoteChanges.current = true; // Set flag
            try {
                const toRemove: TLRecord["id"][] = [];
                const toPut: TLRecord[] = [];

                for (const update of storageChanges) {
                  if (update.type !== "LiveMap") {
                    return;
                  }

                  for (const [id, { type }] of Object.entries(update.updates)) {
                    switch (type) {
                      // Object deleted from Liveblocks, remove from tldraw
                      case "delete": {
                        toRemove.push(id as TLRecord["id"]);
                        break;
                      }

                      // Object updated on Liveblocks, update tldraw
                      case "update": {
                        const curr = update.node.get(id);
                        if (curr) {
                          // Performance Optimization:
                          // Check if the current local state is identical to the incoming remote state.
                          // If so, skip the update to prevent unnecessary processing and "petit freeze" (echo).
                          // This handles the case where Liveblocks echoes back changes made by the local user.
                          const local = store.get(id as TLRecord['id']);
                          if (local && JSON.stringify(local) === JSON.stringify(curr)) {
                              break;
                          }
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          toPut.push(curr as any as TLRecord);
                        }
                        break;
                      }
                    }
                  }
                }

                // Update tldraw with changes
                store.mergeRemoteChanges(() => {
                  if (toRemove.length) {
                    store.remove(toRemove);
                  }
                  if (toPut.length) {
                    store.put(toPut);
                  }
                });
            } finally {
                isApplyingRemoteChanges.current = false; // Reset flag
            }
          },
          { isDeep: true }
        )
      );

      // Set user's info
      const userPreferences = computed<{
        id: string;
        color: string;
        name: string;
      }>("userPreferences", () => {
        if (!user) {
           return { id: 'anon', color: 'black', name: 'Anonymous' };
        }
        return {
          id: user.id,
          color: user.color,
          name: user.name,
        };
      });

      // Unique ID for this session is their connectionId
      const connectionIdString = "" + (room.getSelf()?.connectionId || 0);

      // Set both
      const presenceDerivation = createPresenceStateDerivation(
        userPreferences,
        InstancePresenceRecordType.createId(connectionIdString)
      )(store);

      // Update presence with tldraw values
      room.updatePresence({
        presence: presenceDerivation.get() ?? null,
      });

      // Update Liveblocks when tldraw presence changes
      unsubs.push(
        react("when presence changes", () => {
          if (isApplyingRemoteChanges.current) return;
          const presence = presenceDerivation.get() ?? null;
          requestAnimationFrame(() => {
            room.updatePresence({ presence });
          });
        })
      );

      // Sync Liveblocks presence with tldraw
      unsubs.push(
        room.subscribe("others", (others, event) => {
          isApplyingRemoteChanges.current = true;
          try {
              const toRemove: TLInstancePresence["id"][] = [];
              const toPut: TLInstancePresence[] = [];

              switch (event.type) {
                // A user disconnected from Liveblocks
                case "leave": {
                  if (event.user.connectionId) {
                    toRemove.push(
                      InstancePresenceRecordType.createId(
                        `${event.user.connectionId}`
                      )
                    );
                  }
                  break;
                }

                // Others was reset, e.g. after losing connection and returning
                case "reset": {
                  others.forEach((other) => {
                    toRemove.push(
                      InstancePresenceRecordType.createId(`${other.connectionId}`)
                    );
                  });
                  break;
                }

                // A user entered or their presence updated
                case "enter":
                case "update": {
                  const presence = event?.user?.presence;
                  if (presence?.presence) {
                    toPut.push(event.user.presence.presence);
                  }
                }
              }

              // Update tldraw with changes
              store.mergeRemoteChanges(() => {
                if (toRemove.length) {
                  store.remove(toRemove);
                }
                if (toPut.length) {
                  store.put(toPut);
                }
              });
          } finally {
              isApplyingRemoteChanges.current = false;
          }
        })
      );

      setStoreWithStatus({
        store,
        status: "synced-remote",
        connectionStatus: "online",
      });
    }

    setup();

    return () => {
      unsubs.forEach((fn) => fn());
      unsubs.length = 0;
    };
  }, [room, store, user]);

  return storeWithStatus;
}
