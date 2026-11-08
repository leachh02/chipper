import { getDB } from "./index";
import { notifyChange } from "./changes";
import { DEFAULT_PREFERENCES } from "./init";
import type {
  Video,
  Meta,
  RawVideo,
  Album,
  Episode,
  ChipStatus,
  ChipEvent,
  ItemType,
  Preferences,
} from "../types";

export async function getAllVideos(): Promise<Video[]> {
  const db = await getDB();
  return db.getAll("videos");
}

export async function upsertVideo(video: Video) {
  const db = await getDB();
  await db.put("videos", video);
  notifyChange("local");
}

export async function updateMeta(lastImportAt: number) {
  const db = await getDB();
  const meta = await db.get("meta", "singleton");
  await db.put("meta", { ...meta, lastImportAt } as Meta);
}

export type ImportSummary = { added: number; removed: number };

// Adds or updates videos from Watch Later. A complete import has seen the
// whole playlist, so any video it didn't see is marked as removed.
export async function importRawVideos(
  rawVideos: RawVideo[],
  { complete }: { complete: boolean },
): Promise<ImportSummary> {
  const db = await getDB();
  const tx = db.transaction("videos", "readwrite");
  const store = tx.objectStore("videos");
  const now = Date.now();
  const seen = new Set<string>();
  const summary: ImportSummary = { added: 0, removed: 0 };

  for (const raw of rawVideos) {
    if (!raw.videoId) continue;
    seen.add(raw.videoId);

    const existing = await store.get(raw.videoId);
    if (!existing) summary.added++;

    await store.put({
      id: raw.videoId,
      // Never trust the page completely: a missing title shouldn't break the list
      title: raw.title || existing?.title || "Untitled video",
      channel: raw.channel || existing?.channel || "",
      duration: raw.duration || existing?.duration || "",
      url: raw.url,

      importedAt: existing?.importedAt ?? now,
      lastSeenAt: now,
      // It's in Watch Later, so it hasn't been removed
      removedAt: undefined,
      status: existing?.status ?? "queued",
      changedAt: existing?.changedAt,
    });
  }

  if (complete) {
    for (const video of await store.getAll()) {
      if (!seen.has(video.id) && !video.removedAt) {
        await store.put({ ...video, removedAt: now });
        summary.removed++;
      }
    }
  }

  await tx.done;
  notifyChange("local");
  return summary;
}

export async function markRemovedFromWatchLater(ids: string[]) {
  const db = await getDB();
  const tx = db.transaction("videos", "readwrite");
  const now = Date.now();

  for (const id of ids) {
    const video = await tx.objectStore("videos").get(id);
    if (video) await tx.objectStore("videos").put({ ...video, removedAt: now });
  }

  await tx.done;
  notifyChange("local");
}

// Saves the user's full list of saved albums, keeping Chipper's own fields.
// Albums missing from the list have been removed from the Spotify library.
export async function importAlbums(albums: Album[]): Promise<ImportSummary> {
  const db = await getDB();
  const tx = db.transaction("albums", "readwrite");
  const store = tx.objectStore("albums");
  const now = Date.now();
  const seen = new Set<string>();
  const summary: ImportSummary = { added: 0, removed: 0 };

  for (const album of albums) {
    seen.add(album.id);
    const existing = await store.get(album.id);
    if (!existing) summary.added++;

    await store.put({
      ...album,
      status: existing?.status ?? album.status,
      completed_at: existing?.completed_at ?? album.completed_at,
      rating: existing?.rating ?? album.rating,
      upNext: existing?.upNext,
      loved: existing?.loved,
      genres: existing?.genres.length ? existing.genres : album.genres,
      genresCheckedAt: existing?.genresCheckedAt,
      genresEdited: existing?.genresEdited,
      changedAt: existing?.changedAt,
      removedAt: undefined,
    });
  }

  for (const album of await store.getAll()) {
    if (!seen.has(album.id) && !album.removedAt) {
      await store.put({ ...album, removedAt: now });
      summary.removed++;
    }
  }

  await tx.done;
  notifyChange("local");
  return summary;
}

export async function setAlbumFlags(
  id: string,
  flags: Pick<Album, "upNext" | "loved">,
): Promise<Album | undefined> {
  const db = await getDB();
  const album = await db.get("albums", id);
  if (!album) return;

  const updated = { ...album, ...flags, changedAt: Date.now() };
  await db.put("albums", updated);
  notifyChange("local");
  return updated;
}

// Saves imported genres, except on albums whose genres the user has
// edited. Returns how many of those were kept.
export async function saveAlbumGenres(genresById: Map<string, string[]>) {
  const db = await getDB();
  const tx = db.transaction("albums", "readwrite");
  const now = Date.now();
  let kept = 0;

  for (const [id, genres] of genresById) {
    const album = await tx.objectStore("albums").get(id);
    if (album?.genresEdited) kept++;
    else if (album) {
      await tx.objectStore("albums").put({ ...album, genres, genresCheckedAt: now });
    }
  }

  await tx.done;
  notifyChange("local");
  return kept;
}

export async function setAlbumGenres(
  id: string,
  genres: string[],
): Promise<Album | undefined> {
  const db = await getDB();
  const album = await db.get("albums", id);
  if (!album) return;

  const now = Date.now();
  const updated = { ...album, genres, genresEdited: true, genresCheckedAt: now, changedAt: now };
  await db.put("albums", updated);
  notifyChange("local");
  return updated;
}

export async function getAllEvents(): Promise<ChipEvent[]> {
  const db = await getDB();
  return db.getAll("events");
}

export async function getAllEpisodes(): Promise<Episode[]> {
  const db = await getDB();
  return db.getAll("episodes");
}

// Like importAlbums, for saved podcast episodes. Spotify's own progress
// moves an episode forward, but never back past what the user set here.
export async function importEpisodes(
  episodes: Episode[],
): Promise<ImportSummary> {
  const db = await getDB();
  const tx = db.transaction("episodes", "readwrite");
  const store = tx.objectStore("episodes");
  const now = Date.now();
  const seen = new Set<string>();
  const summary: ImportSummary = { added: 0, removed: 0 };
  const order: ChipStatus[] = ["queued", "in_progress", "completed"];

  for (const episode of episodes) {
    seen.add(episode.id);
    const existing = await store.get(episode.id);
    if (!existing) summary.added++;

    const kept = existing?.status ?? "queued";
    const status =
      order.includes(kept) && order.indexOf(episode.status) > order.indexOf(kept)
        ? episode.status
        : kept;

    await store.put({
      ...episode,
      status,
      // Spotify moving it forward counts as a change
      changedAt: status === kept ? existing?.changedAt : now,
      lastSyncedAt: now,
      removedAt: undefined,
    });
  }

  for (const episode of await store.getAll()) {
    if (!seen.has(episode.id) && !episode.removedAt) {
      await store.put({ ...episode, removedAt: now });
      summary.removed++;
    }
  }

  await tx.done;
  notifyChange("local");
  return summary;
}

export async function setEpisodeStatus(
  id: string,
  status: ChipStatus,
): Promise<Episode | undefined> {
  const db = await getDB();
  const tx = db.transaction(["episodes", "events"], "readwrite");

  const episode = await tx.objectStore("episodes").get(id);
  if (!episode) return;

  episode.status = status;
  episode.changedAt = Date.now();
  await tx.objectStore("episodes").put(episode);
  await tx.objectStore("events").add(newEvent("episode", id, status));
  await tx.done;
  notifyChange("local");

  return episode;
}

export async function getAllAlbums(): Promise<Album[]> {
  const db = await getDB();
  return db.getAll("albums");
}

function newEvent(
  itemType: ItemType,
  itemId: string,
  status: ChipStatus,
): ChipEvent {
  return {
    id: crypto.randomUUID(),
    itemType,
    itemId,
    status,
    timestamp: Date.now(),
  };
}

export async function setVideoStatus(
  id: string,
  status: ChipStatus,
): Promise<Video | undefined> {
  const db = await getDB();
  const tx = db.transaction(["videos", "events"], "readwrite");

  const video = await tx.objectStore("videos").get(id);
  if (!video) return;

  video.status = status;
  video.changedAt = Date.now();
  await tx.objectStore("videos").put(video);
  await tx.objectStore("events").add(newEvent("video", id, status));
  await tx.done;
  notifyChange("local");

  return video;
}

export async function setAlbumStatus(
  id: string,
  status: ChipStatus,
): Promise<Album | undefined> {
  const db = await getDB();
  const tx = db.transaction(["albums", "events"], "readwrite");

  const album = await tx.objectStore("albums").get(id);
  if (!album) return;

  album.status = status;
  album.changedAt = Date.now();
  album.completed_at =
    status === "completed" ? new Date().toISOString() : null;

  await tx.objectStore("albums").put(album);
  await tx.objectStore("events").add(newEvent("album", id, status));
  await tx.done;
  notifyChange("local");

  return album;
}

export async function getPreferences(): Promise<Preferences> {
  const db = await getDB();
  const stored = await db.get("preferences", "singleton");

  // Fill in anything added since the preferences were first saved
  return {
    id: "singleton",
    maxDailyMinutes:
      stored?.maxDailyMinutes ?? DEFAULT_PREFERENCES.maxDailyMinutes,
    hideShorts: stored?.hideShorts ?? DEFAULT_PREFERENCES.hideShorts,
    youtube: { ...DEFAULT_PREFERENCES.youtube, ...stored?.youtube },
    spotify: { ...DEFAULT_PREFERENCES.spotify, ...stored?.spotify },
    podcasts: { ...DEFAULT_PREFERENCES.podcasts, ...stored?.podcasts },
    queue: { ...DEFAULT_PREFERENCES.queue, ...stored?.queue },
  };
}

export async function savePreferences(preferences: Preferences) {
  const db = await getDB();
  await db.put("preferences", preferences);
}
