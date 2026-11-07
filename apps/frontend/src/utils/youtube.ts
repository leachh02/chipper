import { EXTENSION_IDS } from "../config";
import type { RawVideo } from "../types";

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
    const id = crypto.randomUUID();
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

  return { ok: false, error: "The Chipper extension isn't installed" };
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
