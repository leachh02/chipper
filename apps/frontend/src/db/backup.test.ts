import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Album, RawVideo } from "../types";

const raw = (videoId: string): RawVideo => ({
  videoId,
  title: `Video ${videoId}`,
  channel: "Channel",
  duration: "10:00",
  url: `https://www.youtube.com/watch?v=${videoId}`,
});

const album = (id: string): Album => ({
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
  last_synced: String(Date.now()),
  url: "",
});

// Each "device" is its own empty database, with fresh modules pointing at it
async function device() {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  return {
    q: await import("./queries"),
    b: await import("./backup"),
  };
}

let clock = Date.parse("2026-11-01T09:00:00Z");
const tick = (minutes: number) => {
  clock += minutes * 60000;
  vi.setSystemTime(clock);
};

beforeEach(() => {
  // Only Date is faked, so fake-indexeddb's own timers still run
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(clock);
});
afterEach(() => vi.useRealTimers());

describe("backups", () => {
  it("restores an exact copy with replace", async () => {
    const pc = await device();
    await pc.q.importRawVideos([raw("a"), raw("b")], { complete: true });
    await pc.q.setVideoStatus("a", "completed");
    await pc.q.importAlbums([album("x")]);
    await pc.q.setAlbumFlags("x", { upNext: true });
    const backup = JSON.parse(JSON.stringify(await pc.b.createBackup()));

    const phone = await device();
    await phone.q.importRawVideos([raw("old")], { complete: true });
    await phone.b.restoreBackup(phone.b.parseBackup(JSON.stringify(backup)), "replace");

    const copy = await phone.b.createBackup();
    expect(copy.videos).toEqual(backup.videos);
    expect(copy.albums).toEqual(backup.albums);
    expect(copy.events).toHaveLength(1);
  });

  it("merges a phone's choices into the PC without undoing the PC's sync", async () => {
    // The PC syncs Watch Later, then the phone gets a copy
    const pc = await device();
    await pc.q.importRawVideos([raw("a"), raw("b"), raw("c")], { complete: true });
    const first = await pc.b.createBackup();

    const phone = await device();
    await phone.b.restoreBackup(first, "replace");

    // On the phone: watch "a"
    tick(10);
    await phone.q.setVideoStatus("a", "completed");
    const fromPhone = await phone.b.createBackup();

    // Meanwhile the PC skips "b" and syncs again, finding "c" gone
    const pcAgain = await device();
    await pcAgain.b.restoreBackup(first, "replace");
    tick(5);
    await pcAgain.q.setVideoStatus("b", "skipped");
    tick(1);
    await pcAgain.q.importRawVideos([raw("a"), raw("b")], { complete: true });

    const result = await pcAgain.b.restoreBackup(fromPhone, "merge");
    const videos = Object.fromEntries((await pcAgain.q.getAllVideos()).map((v) => [v.id, v]));

    expect(videos.a.status).toBe("completed"); // the phone's choice
    expect(videos.b.status).toBe("skipped"); // the PC's choice, untouched by the phone
    expect(videos.c.removedAt).toBeTypeOf("number"); // the PC's newer sync
    expect(result.added.videos).toBe(0);
    // Both devices' history is kept
    expect((await pcAgain.b.createBackup()).events).toHaveLength(2);
  });

  it("takes album flags and genres from whichever side changed them last", async () => {
    const pc = await device();
    await pc.q.importAlbums([album("x"), album("y")]);
    const first = await pc.b.createBackup();

    const phone = await device();
    await phone.b.restoreBackup(first, "replace");
    tick(1);
    await phone.q.setAlbumFlags("x", { upNext: true, loved: true });
    await phone.q.setAlbumGenres("y", ["Phone genre"]);
    tick(1);
    const fromPhone = await phone.b.createBackup();

    const pcAgain = await device();
    await pcAgain.b.restoreBackup(first, "replace");
    tick(1);
    // The PC edits "y" after the phone did
    await pcAgain.q.setAlbumGenres("y", ["PC genre"]);
    await pcAgain.b.restoreBackup(fromPhone, "merge");

    const albums = Object.fromEntries((await pcAgain.q.getAllAlbums()).map((a) => [a.id, a]));
    expect(albums.x).toMatchObject({ upNext: true, loved: true });
    expect(albums.y.genres).toEqual(["PC genre"]);
  });

  it("uses status history for items saved before change times existed", async () => {
    const pc = await device();
    await pc.q.importRawVideos([raw("a")], { complete: true });
    await pc.q.setVideoStatus("a", "completed");
    const backup = await pc.b.createBackup();
    // As an older Chipper would have saved it
    delete backup.videos[0].changedAt;

    const phone = await device();
    await phone.q.importRawVideos([raw("a")], { complete: true });
    await phone.b.restoreBackup(backup, "merge");

    expect((await phone.q.getAllVideos())[0].status).toBe("completed");
  });

  it("adds items that only one side has", async () => {
    const pc = await device();
    await pc.q.importRawVideos([raw("a")], { complete: true });
    const backup = await pc.b.createBackup();

    const phone = await device();
    await phone.q.importRawVideos([raw("b")], { complete: true });
    const result = await phone.b.restoreBackup(backup, "merge");

    expect(result.added.videos).toBe(1);
    expect((await phone.q.getAllVideos()).map((v) => v.id).sort()).toEqual(["a", "b"]);
  });
});

describe("parseBackup", () => {
  it("rejects files that aren't backups, or are from a newer Chipper", async () => {
    const { b } = await device();
    expect(() => b.parseBackup("not json")).toThrow(/isn't a Chipper backup/);
    expect(() => b.parseBackup(JSON.stringify({ hello: 1 }))).toThrow(/isn't a Chipper backup/);
    expect(() =>
      b.parseBackup(JSON.stringify({ app: "chipper", format: 1, dbVersion: 999, videos: [] })),
    ).toThrow(/newer version/);
  });
});
