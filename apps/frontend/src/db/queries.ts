import { getDB } from "./index";
import type { Video, Meta, RawVideo } from "../types";

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
