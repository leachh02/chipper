import { describe, expect, it } from "vitest";
import type { Album, Episode, RawVideo } from "../types";

// Imported per test so each one gets the fresh database from test/setup.ts
const load = () => import("./queries");

const raw = (videoId: string, duration = "10:00"): RawVideo => ({
  videoId,
  title: `Video ${videoId}`,
  channel: "Channel",
  duration,
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

const episode = (id: string, extra: Partial<Episode> = {}): Episode => ({
  id,
  name: `Episode ${id}`,
  show: "Show",
  image: "",
  release_date: "2026-01-01",
  duration_ms: 60 * 60000,
  resume_position_ms: 0,
  url: "",
  added_at: "2026-01-01T00:00:00Z",
  status: "queued",
  ...extra,
});

describe("importRawVideos", () => {
  it("adds new videos and keeps the status of known ones", async () => {
    const q = await load();
    expect(await q.importRawVideos([raw("a"), raw("b")], { complete: false })).toEqual({
      added: 2,
      removed: 0,
    });
    await q.setVideoStatus("a", "completed");

    const summary = await q.importRawVideos([raw("a"), raw("c")], { complete: false });
    expect(summary).toEqual({ added: 1, removed: 0 });

    const videos = await q.getAllVideos();
    expect(videos.find((v) => v.id === "a")?.status).toBe("completed");
    expect(videos.map((v) => v.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("only marks missing videos as removed on a complete import", async () => {
    const q = await load();
    await q.importRawVideos([raw("a"), raw("b")], { complete: true });

    await q.importRawVideos([raw("a")], { complete: false });
    expect((await q.getAllVideos()).some((v) => v.removedAt)).toBe(false);

    expect(await q.importRawVideos([raw("a")], { complete: true })).toEqual({
      added: 0,
      removed: 1,
    });
    const removed = (await q.getAllVideos()).find((v) => v.id === "b");
    expect(removed?.removedAt).toBeTypeOf("number");
  });

  it("restores a removed video that comes back", async () => {
    const q = await load();
    await q.importRawVideos([raw("a"), raw("b")], { complete: true });
    await q.importRawVideos([raw("a")], { complete: true });
    await q.importRawVideos([raw("a"), raw("b")], { complete: true });

    expect((await q.getAllVideos()).find((v) => v.id === "b")?.removedAt).toBeUndefined();
  });

  it("fills in a missing title or channel", async () => {
    const q = await load();
    await q.importRawVideos([{ videoId: "a" } as RawVideo], { complete: false });

    expect((await q.getAllVideos())[0]).toMatchObject({ title: "Untitled video", channel: "" });
  });

  it("keeps a known duration when the new one is missing", async () => {
    const q = await load();
    await q.importRawVideos([raw("a", "4:20")], { complete: false });
    await q.importRawVideos([raw("a", "")], { complete: false });

    expect((await q.getAllVideos())[0].duration).toBe("4:20");
  });
});

describe("importAlbums", () => {
  it("keeps Chipper's own fields and marks missing albums as removed", async () => {
    const q = await load();
    await q.importAlbums([album("a"), album("b")]);
    await q.setAlbumStatus("a", "completed");
    await q.setAlbumFlags("a", { upNext: true, loved: true });
    await q.setAlbumGenres("a", ["Shoegaze"]);

    const summary = await q.importAlbums([album("a", { name: "Renamed" })]);
    expect(summary).toEqual({ added: 0, removed: 1 });

    const albums = await q.getAllAlbums();
    const a = albums.find((x) => x.id === "a")!;
    expect(a).toMatchObject({
      name: "Renamed",
      status: "completed",
      upNext: true,
      loved: true,
      genres: ["Shoegaze"],
      genresEdited: true,
    });
    expect(albums.find((x) => x.id === "b")?.removedAt).toBeTypeOf("number");
  });

  it("doesn't let a Discogs import overwrite edited genres", async () => {
    const q = await load();
    await q.importAlbums([album("a"), album("b")]);
    await q.setAlbumGenres("a", ["Mine"]);

    const kept = await q.saveAlbumGenres(
      new Map([
        ["a", ["Rock"]],
        ["b", ["Jazz"]],
      ]),
    );

    expect(kept).toBe(1);
    const albums = await q.getAllAlbums();
    expect(albums.find((x) => x.id === "a")?.genres).toEqual(["Mine"]);
    expect(albums.find((x) => x.id === "b")?.genres).toEqual(["Jazz"]);
  });
});

describe("importEpisodes", () => {
  it("moves status forward from Spotify's progress, never back", async () => {
    const q = await load();
    await q.importEpisodes([episode("a"), episode("b")]);

    // Spotify says "a" is started
    await q.importEpisodes([episode("a", { status: "in_progress" }), episode("b")]);
    // The user finished "b" in Chipper, but Spotify still says not started
    await q.setEpisodeStatus("b", "completed");
    await q.importEpisodes([episode("a", { status: "in_progress" }), episode("b")]);

    const episodes = await q.getAllEpisodes();
    expect(episodes.find((e) => e.id === "a")?.status).toBe("in_progress");
    expect(episodes.find((e) => e.id === "b")?.status).toBe("completed");
  });

  it("doesn't overwrite a skip with Spotify's progress", async () => {
    const q = await load();
    await q.importEpisodes([episode("a")]);
    await q.setEpisodeStatus("a", "skipped");
    await q.importEpisodes([episode("a", { status: "completed" })]);

    expect((await q.getAllEpisodes())[0].status).toBe("skipped");
  });
});

describe("getPreferences", () => {
  it("fills in settings added after the preferences were saved", async () => {
    const q = await load();
    const { DEFAULT_PREFERENCES } = await import("./init");
    const { getDB } = await import("./index");
    const db = await getDB();
    // Preferences as an older version of Chipper saved them
    await db.put("preferences", {
      id: "singleton",
      maxDailyMinutes: 60,
      hideShorts: true,
      youtube: DEFAULT_PREFERENCES.youtube,
      spotify: { sortBy: "artist" },
    } as never);

    const prefs = await q.getPreferences();
    expect(prefs.spotify.sortBy).toBe("artist");
    expect(prefs.spotify.statusFilter).toEqual(DEFAULT_PREFERENCES.spotify.statusFilter);
    expect(prefs.queue).toEqual(DEFAULT_PREFERENCES.queue);
    expect(prefs.podcasts).toEqual(DEFAULT_PREFERENCES.podcasts);
  });
});
