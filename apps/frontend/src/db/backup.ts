import { getDB } from "./index";
import { DB_VERSION } from "./constants";
import type { Album, ChipEvent, Episode, ItemType, Preferences, Video } from "../types";

// Everything Chipper keeps about your backlog, in one file. Spotify sign-in
// tokens live in localStorage and are never included.
export type Backup = {
  app: "chipper";
  format: 1;
  dbVersion: number;
  exportedAt: string;
  videos: Video[];
  albums: Album[];
  episodes: Episode[];
  events: ChipEvent[];
  preferences: Preferences | null;
};

export type BackupCounts = { videos: number; albums: number; episodes: number };

export type ImportResult = {
  added: BackupCounts;
  updated: BackupCounts;
};

export async function createBackup(): Promise<Backup> {
  const db = await getDB();
  const [videos, albums, episodes, events, preferences] = await Promise.all([
    db.getAll("videos"),
    db.getAll("albums"),
    db.getAll("episodes"),
    db.getAll("events"),
    db.get("preferences", "singleton"),
  ]);
  return {
    app: "chipper",
    format: 1,
    dbVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    videos,
    albums,
    episodes,
    events,
    preferences: preferences ?? null,
  };
}

// Checks a file is a Chipper backup this version can read
export function parseBackup(text: string): Backup {
  let data: Partial<Backup>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Chipper backup.");
  }
  if (data?.app !== "chipper" || !Array.isArray(data.videos)) {
    throw new Error("That file isn't a Chipper backup.");
  }
  if (data.format !== 1 || (data.dbVersion ?? 0) > DB_VERSION) {
    throw new Error("That backup was made by a newer version of Chipper. Update this copy first.");
  }
  return {
    ...(data as Backup),
    albums: data.albums ?? [],
    episodes: data.episodes ?? [],
    events: data.events ?? [],
    preferences: data.preferences ?? null,
  };
}

// Fields the user sets in Chipper. Everything else comes from YouTube or
// Spotify. Each side of a merge wins its half by whichever is newer.
const OWN_FIELDS = {
  video: ["status", "changedAt"],
  album: [
    "status",
    "completed_at",
    "rating",
    "upNext",
    "loved",
    "genres",
    "genresCheckedAt",
    "genresEdited",
    "changedAt",
  ],
  episode: ["status", "changedAt"],
} as const;

type Item = Video | Album | Episode;

// When an item last came from YouTube or Spotify. Being marked as removed
// counts, since that's also learned from a sync.
function syncedAt(type: ItemType, item: Item): number {
  const synced =
    type === "video"
      ? (item as Video).lastSeenAt
      : type === "album"
        ? Number((item as Album).last_synced) || 0
        : ((item as Episode).lastSyncedAt ?? 0);
  return Math.max(synced, item.removedAt ?? 0);
}

// Latest status change per item, for items saved before changedAt existed
function lastEventTimes(events: ChipEvent[]): Map<string, number> {
  const times = new Map<string, number>();
  for (const e of events) {
    const key = `${e.itemType}:${e.itemId}`;
    times.set(key, Math.max(times.get(key) ?? 0, e.timestamp));
  }
  return times;
}

export function mergeItem<T extends Item>(
  type: ItemType,
  local: T,
  incoming: T,
  localEvents: Map<string, number>,
  incomingEvents: Map<string, number>,
): T {
  const key = `${type}:${local.id}`;
  const changed = (item: T, events: Map<string, number>) =>
    item.changedAt ?? events.get(key) ?? 0;

  const base = syncedAt(type, incoming) > syncedAt(type, local) ? incoming : local;
  const own = changed(incoming, incomingEvents) > changed(local, localEvents) ? incoming : local;

  const merged = { ...base } as Record<string, unknown>;
  for (const field of OWN_FIELDS[type]) {
    merged[field] = (own as Record<string, unknown>)[field];
  }
  return merged as T;
}

// Replace makes this device an exact copy of the backup. Merge keeps
// everything on both sides, taking the newer of each item's two halves.
export async function restoreBackup(
  backup: Backup,
  mode: "merge" | "replace",
): Promise<ImportResult> {
  const db = await getDB();
  const tx = db.transaction(
    ["videos", "albums", "episodes", "events", "preferences"],
    "readwrite",
  );
  const result: ImportResult = {
    added: { videos: 0, albums: 0, episodes: 0 },
    updated: { videos: 0, albums: 0, episodes: 0 },
  };

  if (mode === "replace") {
    await Promise.all(
      (["videos", "albums", "episodes", "events"] as const).map((s) => tx.objectStore(s).clear()),
    );
    if (backup.preferences) await tx.objectStore("preferences").put(backup.preferences);
  }

  const localEvents = lastEventTimes(await tx.objectStore("events").getAll());
  const incomingEvents = lastEventTimes(backup.events);

  const stores = [
    ["video", "videos", backup.videos],
    ["album", "albums", backup.albums],
    ["episode", "episodes", backup.episodes],
  ] as const;

  for (const [type, storeName, items] of stores) {
    const store = tx.objectStore(storeName);
    for (const item of items) {
      const local = await store.get(item.id);
      const value = local ? mergeItem(type, local, item, localEvents, incomingEvents) : item;
      if (!local) result.added[storeName]++;
      else if (JSON.stringify(value) === JSON.stringify(local)) continue;
      else result.updated[storeName]++;
      await store.put(value as never);
    }
  }

  // History is kept from both sides; events have unique IDs
  for (const event of backup.events) {
    await tx.objectStore("events").put(event);
  }

  await tx.done;
  return result;
}

// Named with the local date, e.g. chipper-backup-2026-11-08.json
export function backupFileName(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `chipper-backup-${day}.json`;
}
