import { getDB } from "../db";
import { lastEventTimes, mergeItem } from "../db/backup";
import { notifyChange } from "../db/changes";
import type { ChipEvent, ItemType } from "../types";
import type { Pulled, PushResult, SyncKind, SyncRecord } from "./api";

// Keeps this device and the server in step:
//  1. pull everything that changed since the last revision this device saw
//  2. merge it in, with the same rules as merging a backup
//  3. push whatever differs from the server's copy
// If another device pushed the same records in between, the server refuses
// the push and we go round again.

export type SyncApi = {
  pull(since: number): Promise<Pulled>;
  push(base: number, records: SyncRecord[]): Promise<PushResult>;
};

export type SyncSummary = { received: number; sent: number };

const STORES = {
  video: "videos",
  album: "albums",
  episode: "episodes",
  event: "events",
} as const;

const KINDS = Object.keys(STORES) as SyncKind[];
const CURSOR = "cursor";
const ATTEMPTS = 5;

// JSON with sorted keys, so the same record always gives the same text
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v,
  );
}

// cyrb53: a quick 53-bit string hash. Only compared with itself, never
// used for security.
function fingerprint(value: unknown): string {
  const text = canonical(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export async function getCursor(): Promise<number> {
  const db = await getDB();
  return (await db.get("sync", CURSOR))?.revision ?? 0;
}

// Forgets what the server has, e.g. after signing out, so the next account
// this device signs in to gets all of its data
export async function resetSync() {
  const db = await getDB();
  await db.clear("sync");
}

async function applyPulled({ revision, records }: Pulled): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(["videos", "albums", "episodes", "events", "sync"], "readwrite");
  const sync = tx.objectStore("sync");

  const localEvents = lastEventTimes(await tx.objectStore("events").getAll());
  const incomingEvents = lastEventTimes(
    records.filter((r) => r.kind === "event").map((r) => r.data as ChipEvent),
  );

  let received = 0;
  for (const record of records) {
    // Anything this version doesn't sync, such as preferences
    if (!KINDS.includes(record.kind)) continue;
    const store = tx.objectStore(STORES[record.kind]);
    const local = (await store.get(record.id)) as object | undefined;

    const value =
      local && record.kind !== "event"
        ? mergeItem(record.kind as ItemType, local as never, record.data as never, localEvents, incomingEvents)
        : record.data;
    if (!local || canonical(value) !== canonical(local)) {
      await store.put(value as never);
      received++;
    }
    // The server's copy, so a merge that kept something of ours gets pushed
    await sync.put({ key: `${record.kind}:${record.id}`, hash: fingerprint(record.data), revision: record.revision });
  }
  await sync.put({ key: CURSOR, revision });
  await tx.done;

  if (received) notifyChange("remote");
  return received;
}

type Change = SyncRecord & { hash: string };

async function collectChanges(): Promise<Change[]> {
  const db = await getDB();
  const tx = db.transaction(["videos", "albums", "episodes", "events", "sync"]);
  const known = new Map(
    (await tx.objectStore("sync").getAll()).map((entry) => [entry.key, entry.hash]),
  );

  const changes: Change[] = [];
  for (const kind of KINDS) {
    for (const item of await tx.objectStore(STORES[kind]).getAll()) {
      const hash = fingerprint(item);
      if (known.get(`${kind}:${item.id}`) !== hash) {
        changes.push({ kind, id: item.id, data: item, hash });
      }
    }
  }
  await tx.done;
  return changes;
}

async function markPushed(changes: Change[], revision: number, cursor: number | null) {
  const db = await getDB();
  const tx = db.transaction("sync", "readwrite");
  for (const { kind, id, hash } of changes) {
    await tx.store.put({ key: `${kind}:${id}`, hash, revision });
  }
  if (cursor !== null) await tx.store.put({ key: CURSOR, revision: cursor });
  await tx.done;
}

export async function syncOnce(api: SyncApi): Promise<SyncSummary> {
  const summary: SyncSummary = { received: 0, sent: 0 };

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const pulled = await api.pull(await getCursor());
    summary.received += await applyPulled(pulled);

    const changes = await collectChanges();
    if (!changes.length) return summary;

    const result = await api.push(
      pulled.revision,
      changes.map(({ kind, id, data }) => ({ kind, id, data })),
    );
    if (result.ok) {
      // If nobody else pushed in between, there's nothing new to pull.
      // Otherwise leave the cursor, and the next sync fetches their changes.
      const cursor = result.revision === pulled.revision + 1 ? result.revision : null;
      await markPushed(changes, result.revision, cursor);
      summary.sent += changes.length;
      return summary;
    }
  }
  throw new Error("Another device kept changing the same things. Chipper will try again shortly.");
}
