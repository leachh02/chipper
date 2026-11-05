import { getDB } from "./index";
import { DEFAULT_PREFERENCES } from "./init";
import type {
  Video,
  Meta,
  RawVideo,
  Album,
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
}

export async function updateMeta(lastImportAt: number) {
  const db = await getDB();
  const meta = await db.get("meta", "singleton");
  await db.put("meta", { ...meta, lastImportAt } as Meta);
}

export async function importRawVideos(rawVideos: RawVideo[]) {
  const db = await getDB();
  const now = Date.now();

  for (const raw of rawVideos) {
    if (!raw.videoId) continue;

    const existing = await db.get("videos", raw.videoId);

    const video: Video = {
      id: raw.videoId,
      title: raw.title,
      channel: raw.channel,
      duration: raw.duration,
      url: raw.url,
      thumbnail: raw.thumbnail,

      importedAt: existing?.importedAt ?? now,
      lastSeenAt: now,
      status: existing?.status ?? "queued",
    };

    await db.put("videos", video);
  }
}

export async function importAlbums(albums: Album[]): Promise<Album[]> {
  const db = await getDB();
  const imported: Album[] = [];

  for (const album of albums) {
    const existing = await db.get("albums", album.id);

    const merged: Album = {
      ...album,
      status: existing?.status ?? album.status,
      completed_at: existing?.completed_at ?? album.completed_at,
      rating: existing?.rating ?? album.rating,
      genres: existing?.genres.length ? existing.genres : album.genres,
    };

    await db.put("albums", merged);
    imported.push(merged);
  }

  return imported;
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
  await tx.objectStore("videos").put(video);
  await tx.objectStore("events").add(newEvent("video", id, status));
  await tx.done;

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
  album.completed_at =
    status === "completed" ? new Date().toISOString() : null;

  await tx.objectStore("albums").put(album);
  await tx.objectStore("events").add(newEvent("album", id, status));
  await tx.done;

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
  };
}

export async function savePreferences(preferences: Preferences) {
  const db = await getDB();
  await db.put("preferences", preferences);
}
