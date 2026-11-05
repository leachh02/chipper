import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION } from "./constants";
import type { Video, ChipEvent, Preferences, Meta, Album } from "../types";

export interface ChipperDB extends DBSchema {
  videos: {
    key: string;
    value: Video;
  };
  albums: {
    key: string;
    value: Album;
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

        // v4: videoEvents was replaced by the shared events store, and
        // albums moved from "unheard" to the shared "queued" status
        const untypedDB = db as unknown as IDBPDatabase;
        if (untypedDB.objectStoreNames.contains("videoEvents")) {
          untypedDB.deleteObjectStore("videoEvents");
        }

        if (oldVersion > 0 && oldVersion < 4) {
          let cursor = await transaction.objectStore("albums").openCursor();
          while (cursor) {
            if ((cursor.value.status as string) === "unheard") {
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
