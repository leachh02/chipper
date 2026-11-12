import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Album, RawVideo } from "../types";
import type { Pulled, PushResult, SyncRecord } from "./api";
import type { SyncApi } from "./engine";

const raw = (videoId: string): RawVideo => ({
  videoId,
  title: `Video ${videoId}`,
  channel: "Channel",
  duration: "10:00",
  url: `https://www.youtube.com/watch?v=${videoId}`,
});

const album = (id: string, extra: Partial<Album> = {}): Album => ({
  id,
  name: `Album ${id}`,
  artist: "Artist",
  artist_id: "artist",
  image: "",
  release_date: "2001",
  total_tracks: 10,
  runtime_ms: 40 * 60000,
  genres: [],
  status: "queued",
  completed_at: null,
  rating: null,
  added_at: "2026-01-01T00:00:00Z",
  last_synced: "0",
  url: "",
  ...extra,
});

// Behaves like apps/backend: one revision per push, and a push is refused if
// it touches a record changed since `base`
class FakeServer {
  revision = 0;
  records = new Map<string, Required<SyncRecord>>();
  pushes = 0;

  api(): SyncApi {
    return {
      pull: async (since): Promise<Pulled> => ({
        revision: this.revision,
        // A round trip through JSON, like the real thing
        records: JSON.parse(
          JSON.stringify([...this.records.values()].filter((r) => r.revision > since)),
        ),
      }),
      push: async (base, records): Promise<PushResult> => {
        this.pushes++;
        const clash = records.some(
          (r) => r.kind !== "event" && (this.records.get(`${r.kind}:${r.id}`)?.revision ?? 0) > base,
        );
        if (clash) return { ok: false, revision: this.revision };
        this.revision++;
        for (const r of JSON.parse(JSON.stringify(records)) as SyncRecord[]) {
          this.records.set(`${r.kind}:${r.id}`, { ...r, revision: this.revision });
        }
        return { ok: true, revision: this.revision };
      },
    };
  }
}

// Each "device" is its own database, with fresh modules pointing at it.
// Opening it straight away ties those modules to this database.
async function device() {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  await (await import("../db")).getDB();
  return {
    q: await import("../db/queries"),
    sync: await import("./engine"),
  };
}

let clock = Date.parse("2026-11-01T09:00:00Z");
const tick = (minutes: number) => {
  clock += minutes * 60000;
  vi.setSystemTime(clock);
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(clock);
});
afterEach(() => vi.useRealTimers());

describe("sync", () => {
  it("brings one device's backlog to another", async () => {
    const server = new FakeServer();
    const pc = await device();
    await pc.q.importRawVideos([raw("a"), raw("b")], { complete: true });
    await pc.q.setVideoStatus("a", "completed");

    expect(await pc.sync.syncOnce(server.api())).toEqual({ received: 0, sent: 3 });

    const phone = await device();
    expect(await phone.sync.syncOnce(server.api())).toEqual({ received: 3, sent: 0 });
    const videos = await phone.q.getAllVideos();
    expect(videos.map((v) => [v.id, v.status])).toEqual([
      ["a", "completed"],
      ["b", "queued"],
    ]);
    expect(await phone.q.getAllEvents()).toHaveLength(1);
  });

  it("only pushes what changed", async () => {
    const server = new FakeServer();
    const pc = await device();
    await pc.q.importRawVideos([raw("a"), raw("b")], { complete: true });
    await pc.sync.syncOnce(server.api());

    expect(await pc.sync.syncOnce(server.api())).toEqual({ received: 0, sent: 0 });
    tick(1);
    await pc.q.setVideoStatus("b", "skipped");
    // The video and its new event
    expect(await pc.sync.syncOnce(server.api())).toEqual({ received: 0, sent: 2 });
  });

  it("keeps the newest choice when both devices change the same video", async () => {
    const server = new FakeServer();
    const pc = await device();
    await pc.q.importRawVideos([raw("a")], { complete: true });
    await pc.sync.syncOnce(server.api());
    const phone = await device();
    await phone.sync.syncOnce(server.api());

    // Both offline: the PC skips it, then later the phone finishes it
    tick(1);
    await pc.q.setVideoStatus("a", "skipped");
    tick(1);
    await phone.q.setVideoStatus("a", "completed");

    await phone.sync.syncOnce(server.api());
    await pc.sync.syncOnce(server.api());
    await phone.sync.syncOnce(server.api());

    for (const d of [pc, phone]) {
      expect((await d.q.getAllVideos())[0].status).toBe("completed");
      // Both events are kept as history
      expect(await d.q.getAllEvents()).toHaveLength(2);
    }
  });

  it("tries again when another device pushes in the middle of a sync", async () => {
    const server = new FakeServer();
    const pc = await device();
    await pc.q.importRawVideos([raw("a")], { complete: true });
    await pc.sync.syncOnce(server.api());
    const phone = await device();
    await phone.sync.syncOnce(server.api());

    tick(1);
    await pc.q.setVideoStatus("a", "skipped");
    tick(1);
    await phone.q.setVideoStatus("a", "completed");

    // The phone's push lands just after the PC's first pull
    const api = server.api();
    let interrupted = false;
    const racing: SyncApi = {
      pull: async (since) => {
        const pulled = await api.pull(since);
        if (!interrupted) {
          interrupted = true;
          await phone.sync.syncOnce(server.api());
        }
        return pulled;
      },
      push: api.push,
    };
    const pushesBefore = server.pushes;
    await pc.sync.syncOnce(racing);
    // The phone's one push, then the PC's refused push and its retry
    expect(server.pushes - pushesBefore).toBe(3);

    await phone.sync.syncOnce(server.api());
    for (const d of [pc, phone]) {
      expect((await d.q.getAllVideos())[0].status).toBe("completed");
    }
  });

  it("keeps the PC's Watch Later sync and the phone's choice together", async () => {
    const server = new FakeServer();
    const pc = await device();
    await pc.q.importRawVideos([raw("a"), raw("b")], { complete: true });
    await pc.sync.syncOnce(server.api());
    const phone = await device();
    await phone.sync.syncOnce(server.api());

    tick(1);
    await phone.q.setVideoStatus("a", "completed");
    tick(1);
    // Meanwhile the PC syncs Watch Later and finds b was removed
    await pc.q.importRawVideos([raw("a")], { complete: true });

    await phone.sync.syncOnce(server.api());
    await pc.sync.syncOnce(server.api());
    await phone.sync.syncOnce(server.api());

    for (const d of [pc, phone]) {
      const videos = await d.q.getAllVideos();
      expect(videos.find((v) => v.id === "a")?.status).toBe("completed");
      expect(videos.find((v) => v.id === "b")?.removedAt).toBeDefined();
    }
  });

  it("pushes everything again after a reset, e.g. for a new account", async () => {
    const pc = await device();
    await pc.q.importRawVideos([raw("a")], { complete: true });
    await pc.sync.syncOnce(new FakeServer().api());

    await pc.sync.resetSync();
    expect(await pc.sync.syncOnce(new FakeServer().api())).toEqual({ received: 0, sent: 1 });
  });

  it("tells the pages when another device's changes arrive", async () => {
    const server = new FakeServer();
    const pc = await device();
    await pc.q.importRawVideos([raw("a")], { complete: true });
    await pc.sync.syncOnce(server.api());

    const phone = await device();
    const { onChange } = await import("../db/changes");
    const heard = vi.fn();
    onChange("remote", heard);
    await phone.sync.syncOnce(server.api());
    expect(heard).toHaveBeenCalledOnce();
  });

  it("takes the server's topic groups and never pushes them back", async () => {
    const server = new FakeServer();
    const phone = await device();
    const topics = {
      id: "video",
      itemType: "video",
      groups: [{ label: "Cooking", ids: ["a"] }],
      requested: null,
      createdAt: clock,
    };
    server.revision = 1;
    server.records.set("cluster:video", { kind: "cluster", id: "video", data: topics, revision: 1 });

    expect(await phone.sync.syncOnce(server.api())).toEqual({ received: 1, sent: 0 });
    expect(await phone.q.getTopics("video")).toEqual(topics);

    // Regrouping replaces them outright
    server.revision = 2;
    const regrouped = { ...topics, groups: [{ label: "Baking", ids: ["a"] }], createdAt: clock + 1 };
    server.records.set("cluster:video", { kind: "cluster", id: "video", data: regrouped, revision: 2 });
    await phone.sync.syncOnce(server.api());
    expect((await phone.q.getTopics("video"))?.groups[0].label).toBe("Baking");
    expect(server.pushes).toBe(0);
  });

  it("brings genres found on one device to another that has the album too", async () => {
    const server = new FakeServer();
    const pc = await device();
    const phone = await device();
    // Both connected to Spotify and saw the album before any genres
    await pc.q.importAlbums([album("a")]);
    await phone.q.importAlbums([album("a")]);
    await pc.sync.syncOnce(server.api());
    await phone.sync.syncOnce(server.api());

    tick(1);
    await pc.q.saveAlbumGenres(new Map([["a", ["Jazz"]]]));
    await pc.sync.syncOnce(server.api());
    await phone.sync.syncOnce(server.api());

    expect((await phone.q.getAllAlbums())[0].genres).toEqual(["Jazz"]);
    // And neither keeps pushing its copy back
    expect(await pc.sync.syncOnce(server.api())).toEqual({ received: 0, sent: 0 });
    expect(await phone.sync.syncOnce(server.api())).toEqual({ received: 0, sent: 0 });
  });

  it("settles when two devices' copies differ but neither is newer", async () => {
    const server = new FakeServer();
    const pc = await device();
    const phone = await device();
    await pc.q.importAlbums([album("a", { name: "Live" })]);
    await phone.q.importAlbums([album("a", { name: "Live (Remastered)" })]);

    for (let i = 0; i < 3; i++) {
      await pc.sync.syncOnce(server.api());
      await phone.sync.syncOnce(server.api());
    }
    const before = server.pushes;
    await pc.sync.syncOnce(server.api());
    await phone.sync.syncOnce(server.api());
    expect(server.pushes).toBe(before);
    expect((await pc.q.getAllAlbums())[0].name).toBe((await phone.q.getAllAlbums())[0].name);
  });
});
