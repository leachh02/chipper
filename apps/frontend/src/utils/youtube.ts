import { EXTENSION_IDS, EXTENSION_NEEDS_ADDRESS } from "../config";
import { randomId } from "./id";
import type { RawVideo, Video, YouTubePreferences } from "../types";

export type SyncMode = "quick" | "full";

type ExtensionError = { ok: false; error: string };

export type SyncResult =
  | { ok: true; videos: RawVideo[]; complete: boolean }
  | ExtensionError;

export type RemoveResult =
  | { ok: true; removed: string[]; notFound: string[]; failed: string[] }
  | ExtensionError;

export function thumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

// "1:02:03" -> 3723. Missing or unreadable durations count as 0.
export function durationToSeconds(duration: string) {
  if (!duration) return 0;
  const seconds = duration
    .split(":")
    .reduce((acc, part) => acc * 60 + Number(part), 0);
  return Number.isFinite(seconds) ? seconds : 0;
}

export function syncWatchLater(mode: SyncMode, knownIds: string[]) {
  return sendToExtension<SyncResult>({
    type: "SYNC_WATCH_LATER",
    mode,
    knownIds,
  });
}

// Phones and tablets can't run the extension (Chrome and Safari there have
// no extensions), so Watch Later is synced from a computer instead
export const DEVICE_RUNS_EXTENSIONS =
  typeof window === "undefined" || !window.matchMedia?.("(pointer: coarse)").matches;

// Whether the extension is installed and can talk to this page
export async function pingExtension(): Promise<boolean> {
  const response = await sendToExtension<{ ok: boolean }>({ type: "PING" });
  return response.ok;
}

export function removeFromWatchLater(videoIds: string[]) {
  return sendToExtension<RemoveResult>({
    type: "REMOVE_FROM_WATCH_LATER",
    videoIds,
  });
}

function sendToExtensionId<T>(id: string, message: object): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(id, message, undefined, (response?: T) => resolve(response));
  });
}

// Firefox doesn't let pages message extensions, so the extension's
// app-bridge content script relays for us through window messages
function sendThroughBridge<T>(message: object, timeoutMs?: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const id = randomId();
    const timer = timeoutMs ? setTimeout(() => finish(undefined), timeoutMs) : undefined;

    function finish(response: T | undefined) {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(response);
    }
    function onMessage(event: MessageEvent) {
      if (event.source === window && event.data?.source === "chipper-extension" && event.data.id === id) {
        finish(event.data.response);
      }
    }

    window.addEventListener("message", onMessage);
    window.postMessage({ source: "chipper-app", id, message }, window.location.origin);
  });
}

// Tries each configured extension ID directly (Chrome), then the bridge
async function sendToExtension<T>(message: object): Promise<T | ExtensionError> {
  // Chrome only exposes this on pages an installed extension accepts
  if (typeof window.chrome?.runtime?.sendMessage === "function") {
    for (const id of EXTENSION_IDS) {
      const response = await sendToExtensionId<T>(id, message);
      if (response) return response;
    }
  }

  // A quick ping first, so a long task never waits on a bridge that isn't there
  const bridged = await sendThroughBridge<{ ok: boolean }>({ type: "PING" }, 1500);
  if (bridged?.ok) {
    const response = await sendThroughBridge<T>(message);
    if (response) return response;
    return { ok: false, error: "The Chipper extension didn't respond" };
  }

  return {
    ok: false,
    error: EXTENSION_NEEDS_ADDRESS
      ? `The Chipper extension isn't installed, or doesn't know this address yet. Click its toolbar button, add ${window.location.host}, then refresh this page.`
      : "The Chipper extension isn't installed",
  };
}

const byText = (text: (v: Video) => string) => (a: Video, b: Video) =>
  text(a).trim().localeCompare(text(b).trim(), undefined, { sensitivity: "base" });

const SORTS: Record<
  YouTubePreferences["sortBy"],
  ((a: Video, b: Video) => number) | ((v: Video) => number | undefined)[]
> = {
  title: byText((v) => v.title),
  channel: byText((v) => v.channel),
  duration: (a, b) => durationToSeconds(a.duration) - durationToSeconds(b.duration),
  // The rest are numbers only some videos have, such as views before a
  // full sync, so each is a list of numbers to compare in turn
  addedToWatchLater: [(v) => v.watchLaterOrder],
  // A first sync brings everything in at once, so ties go by Watch Later
  addedToChipper: [(v) => v.importedAt, (v) => v.watchLaterOrder],
  views: [(v) => v.views],
  uploaded: [(v) => v.uploadedAt],
};

// Videos in the order chosen on Watch Later. Videos missing the number a
// sort uses go last either way.
export function sortVideos(
  videos: Video[],
  sortBy: YouTubePreferences["sortBy"],
  order: YouTubePreferences["sortOrder"],
): Video[] {
  const sort = SORTS[sortBy] ?? SORTS.title;
  const direction = order === "asc" ? 1 : -1;
  return [...videos].sort((a, b) => {
    if (typeof sort === "function") return direction * sort(a, b);
    for (const value of sort) {
      const [x, y] = [value(a), value(b)];
      if (x === undefined || y === undefined) {
        if (x !== y) return x === undefined ? 1 : -1;
        continue;
      }
      if (x !== y) return direction * (x - y);
    }
    return 0;
  });
}

const VIEW_SCALES: Record<string, number> = {
  "": 1,
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  million: 1e6,
  b: 1e9,
  billion: 1e9,
};

// "1.2M views" -> 1200000, "776 million views" -> 776000000,
// "1,234 views" -> 1234, "No views" -> 0
export function parseViews(text?: string): number | undefined {
  const match = text?.match(/^([\d.,]+)\s?([KMB]|thousand|million|billion)?\s+views?$/i);
  if (!match) return /^no\s+views?$/i.test(text ?? "") ? 0 : undefined;
  const suffix = (match[2] ?? "").toLowerCase();
  const scale = VIEW_SCALES[suffix];
  // A suffix means a decimal point ("1.2M"); without one, commas group digits
  const number = suffix ? Number(match[1].replace(",", ".")) : Number(match[1].replace(/[.,]/g, ""));
  return Number.isFinite(number) ? Math.round(number * scale) : undefined;
}

const UNIT_MS = {
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000,
};

// "3 years ago" -> about three years before now
export function parseUploaded(text: string | undefined, now: number): number | undefined {
  const match = text?.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i);
  if (!match) return undefined;
  return now - Number(match[1]) * UNIT_MS[match[2].toLowerCase() as keyof typeof UNIT_MS];
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// Finds one video per row: a bare ID under a "Video ID" column (Google
// Takeout), or a YouTube URL anywhere in the row
export function parseVideoIdsFromCsv(csv: string): string[] {
  const ids = new Set<string>();
  let idColumn = -1;

  for (const line of csv.split(/\r?\n/)) {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

    const header = cells.findIndex((c) => /^video id$/i.test(c));
    if (header !== -1) {
      idColumn = header;
      continue;
    }

    const bareId = cells[idColumn];
    if (bareId && VIDEO_ID.test(bareId)) {
      ids.add(bareId);
      continue;
    }

    const fromUrl = cells.map(videoIdFromUrl).find(Boolean);
    if (fromUrl) ids.add(fromUrl);
  }

  return [...ids];
}

function videoIdFromUrl(text: string): string | null {
  try {
    const url = new URL(text);
    const id =
      url.hostname === "youtu.be"
        ? url.pathname.slice(1)
        : url.hostname.endsWith("youtube.com")
          ? url.searchParams.get("v")
          : null;
    return id && VIDEO_ID.test(id) ? id : null;
  } catch {
    // Not a URL
  }
  return null;
}

// Title and channel for a video, from YouTube's public oEmbed endpoint.
// oEmbed doesn't include durations.
export async function fetchVideoDetails(videoId: string): Promise<RawVideo> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const fallback = { videoId, title: "Unavailable video", channel: "", duration: "", url };

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    );
    if (!response.ok) return fallback;
    const data: { title?: string; author_name?: string } = await response.json();
    return {
      ...fallback,
      title: data.title ?? fallback.title,
      channel: data.author_name ?? "",
    };
  } catch {
    return fallback;
  }
}
