import type { Album, ChipStatus, Episode, ItemType, Topics, Video } from "../types";
import { durationToSeconds, thumbnailUrl } from "./youtube";

// One thing to watch or listen to in a session, from any service
export type QueueItem = {
  key: string;
  type: ItemType;
  id: string;
  title: string;
  subtitle: string;
  image: string;
  url: string;
  // Time it takes, or what's left of a part-listened episode
  minutes: number;
  status: ChipStatus;
  shortlisted: boolean;
};

// Only items still waiting in the backlog. "Later" (deferred) is set aside on purpose.
const WAITING: ChipStatus[] = ["queued", "in_progress"];

export function videoItems(videos: Video[]): QueueItem[] {
  return videos
    .filter((v) => !v.removedAt && WAITING.includes(v.status))
    .map((v) => ({
      key: `video:${v.id}`,
      type: "video",
      id: v.id,
      title: v.title,
      subtitle: v.channel,
      image: thumbnailUrl(v.id),
      url: v.url,
      minutes: durationToSeconds(v.duration) / 60,
      status: v.status,
      shortlisted: false,
    }));
}

export function albumItems(albums: Album[]): QueueItem[] {
  return albums
    .filter((a) => !a.removedAt && WAITING.includes(a.status))
    .map((a) => ({
      key: `album:${a.id}`,
      type: "album",
      id: a.id,
      title: a.name,
      subtitle: a.artist,
      image: a.image,
      url: a.url,
      minutes: a.runtime_ms / 60000,
      status: a.status,
      shortlisted: !!a.upNext,
    }));
}

export function episodeItems(episodes: Episode[]): QueueItem[] {
  return episodes
    .filter((e) => !e.removedAt && WAITING.includes(e.status))
    .map((e) => ({
      key: `episode:${e.id}`,
      type: "episode",
      id: e.id,
      title: e.name,
      subtitle: e.show,
      image: e.image,
      url: e.url,
      minutes: Math.max(0, e.duration_ms - e.resume_position_ms) / 60000,
      status: e.status,
      shortlisted: false,
    }));
}

// "video:Cooking", as kept in the chip session's chosen topics
export const topicKey = (kind: ItemType, label: string) => `${kind}:${label}`;

// Keeps only items in the chosen topics. A kind with none chosen, or whose
// chosen topics are gone after regrouping, isn't narrowed down.
export function inTopics(items: QueueItem[], topics: Topics[], chosen: string[]): QueueItem[] {
  const allowed = new Map<ItemType, Set<string>>();
  for (const { itemType, groups } of topics) {
    for (const group of groups) {
      if (!chosen.includes(topicKey(itemType, group.label))) continue;
      const ids = allowed.get(itemType) ?? new Set<string>();
      group.ids.forEach((id) => ids.add(id));
      allowed.set(itemType, ids);
    }
  }
  return items.filter((item) => allowed.get(item.type)?.has(item.id) ?? true);
}

// Started items first, then the shortlist, then everything else
export function tier(item: QueueItem) {
  if (item.status === "in_progress") return 0;
  if (item.shortlisted) return 1;
  return 2;
}

// Picks items to fill the time: in tier order, shortest first within each
// tier, skipping anything that won't fit so shorter items can fill the gap.
export function buildQueue(items: QueueItem[], budgetMinutes: number): QueueItem[] {
  const ordered = items
    // Without a length there's no way to budget for it
    .filter((item) => item.minutes > 0)
    .sort((a, b) => tier(a) - tier(b) || a.minutes - b.minutes);

  const queue: QueueItem[] = [];
  let left = budgetMinutes;
  for (const item of ordered) {
    if (item.minutes <= left) {
      queue.push(item);
      left -= item.minutes;
    }
  }
  return queue;
}
