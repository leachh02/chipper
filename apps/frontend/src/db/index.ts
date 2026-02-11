import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION } from "./constants";
import type { Video, VideoEvent, Preferences, Meta } from "../types";

export interface ChipperDB extends DBSchema {
  videos: {
    key: string;
    value: Video;
  };
  videoEvents: {
    key: string;
    value: VideoEvent;
    indexes: { byVideo: string };
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
      upgrade(db) {
        if (!db.objectStoreNames.contains("videos")) {
          db.createObjectStore("videos", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("videoEvents")) {
          const store = db.createObjectStore("videoEvents", {
            keyPath: "id",
          });
          store.createIndex("byVideo", "videoId");
        }

        if (!db.objectStoreNames.contains("preferences")) {
          db.createObjectStore("preferences", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "id" });
        }
      },
    });
  }

  return dbPromise;
}
