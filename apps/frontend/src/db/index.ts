import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION } from "./constants";
import type {
  Video,
  ChipEvent,
  Preferences,
  Meta,
  Album,
  Episode,
  SyncEntry,
  Topics,
} from "../types";

export interface ChipperDB extends DBSchema {
  videos: {
    key: string;
    value: Video;
  };
  albums: {
    key: string;
    value: Album;
  };
  episodes: {
    key: string;
    value: Episode;
  };
  events: {
    key: string;
    value: ChipEvent;
    indexes: { byItem: [string, string] };
  };
  preferences: {
    key: string;
    value: Preferences;
  };
  meta: {
    key: string;
    value: Meta;
  };
  // Groups by topic from a Chipper server, one per kind
  topics: {
    key: string;
    value: Topics;
  };
  // What the sync server last had for each record (see sync/engine.ts)
  sync: {
    key: string;
    value: SyncEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<ChipperDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChipperDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains("videos")) {
          db.createObjectStore("videos", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("events")) {
          const store = db.createObjectStore("events", { keyPath: "id" });
          store.createIndex("byItem", ["itemType", "itemId"]);
        }

        if (!db.objectStoreNames.contains("preferences")) {
          db.createObjectStore("preferences", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("albums")) {
          db.createObjectStore("albums", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("episodes")) {
          db.createObjectStore("episodes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("sync")) {
          db.createObjectStore("sync", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("topics")) {
          db.createObjectStore("topics", { keyPath: "id" });
        }

        // v4: videoEvents was replaced by the shared events store
        const untypedDB = db as unknown as IDBPDatabase;
        if (untypedDB.objectStoreNames.contains("videoEvents")) {
          untypedDB.deleteObjectStore("videoEvents");
        }

        // v4 moved albums from "unheard" to the shared "queued" status, and
        // v5 dropped "deferred" for albums now that the shortlist exists
        if (oldVersion > 0 && oldVersion < 5) {
          let cursor = await transaction.objectStore("albums").openCursor();
          while (cursor) {
            const status = cursor.value.status as string;
            if (status === "unheard" || status === "deferred") {
              await cursor.update({ ...cursor.value, status: "queued" });
            }
            cursor = await cursor.continue();
          }
        }
      },
    });
  }

  return dbPromise;
}
