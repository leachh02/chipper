// Runs on the Watch Later page. The background worker opens the page and
// sends a task; this script does the work and replies with the result.

// Everything that depends on YouTube's page markup lives here. YouTube is
// moving playlists from ytd-playlist-video-renderer to yt-lockup-view-model,
// so both are supported.
const SELECTORS = {
  playlist: "ytd-browse #primary",
  item: "ytd-playlist-video-renderer, yt-lockup-view-model",
  titleLink:
    "a#video-title, yt-lockup-metadata-view-model a[href*='/watch?v=']",
  channelLink: "ytd-channel-name a, a[href^='/@'], a[href^='/channel/']",
  duration: "ytd-thumbnail-overlay-time-status-renderer #text, badge-shape",
  continuation: "ytd-continuation-item-renderer, yt-continuation-item-view-model",
  menuButton: "#menu button, button[aria-label='More actions']",
  menuItem: "ytd-menu-service-item-renderer, yt-list-item-view-model",
  // Only matches an English YouTube interface for now
  removeMenuText: /remove from watch later/i,
};

// How long to wait for the first video before assuming the list is empty
const FIRST_ITEM_TIMEOUT_MS = 20000;
// Stop scrolling once the video count has held steady this long
const SETTLE_MS = 3000;
// ...or this long if YouTube still shows a loading spinner
const SPINNER_SETTLE_MS = 12000;
// A quick sync stops after this many videos in a row that Chipper already has
const QUICK_SYNC_KNOWN_RUN = 5;

let backdrop = null;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "RUN_TASK") return;

  runTask(msg.task)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err?.message ?? err) }))
    .finally(removeBlockingOverlay);
  return true; // respond asynchronously
});

async function runTask(task) {
  if (task.type === "SYNC_WATCH_LATER") {
    createBlockingOverlay("Syncing Watch Later");
    return syncWatchLater(task);
  }
  if (task.type === "REMOVE_FROM_WATCH_LATER") {
    createBlockingOverlay("Removing chipped videos");
    return removeFromWatchLater(task.videoIds);
  }
  return { ok: false, error: `Unknown task ${task.type}` };
}

async function syncWatchLater({ mode, knownIds = [] }) {
  const known = new Set(knownIds);
  const quick = mode === "quick" && known.size > 0;

  const complete = await loadItems(
    quick ? () => endsWithKnownRun(readItems(), known) : undefined,
  );

  const videos = readItems();
  if (videos.length === 0) {
    return {
      ok: false,
      error:
        "No videos found on the Watch Later page. Either it's empty, you're signed out, or YouTube changed its page layout.",
    };
  }

  return { ok: true, videos, complete: !quick && complete };
}

async function removeFromWatchLater(videoIds) {
  const wanted = new Set(videoIds);
  await loadItems(() =>
    [...wanted].every((id) => findItem(id) !== undefined),
  );

  const removed = [];
  const notFound = [];
  const failed = [];

  for (const id of videoIds) {
    const el = findItem(id);
    if (!el) {
      notFound.push(id);
      continue;
    }
    (await removeItem(el)) ? removed.push(id) : failed.push(id);
    updateOverlay(`Removed ${removed.length} of ${videoIds.length}`);
  }

  return { ok: true, removed, notFound, failed };
}

// Scrolls until every video has loaded, or until stopWhen() returns true.
// Returns whether the whole playlist was loaded.
async function loadItems(stopWhen) {
  // YouTube renders the list a little after the tab finishes loading
  await waitFor(
    () => playlistRoot().querySelector(SELECTORS.item),
    FIRST_ITEM_TIMEOUT_MS,
  );

  let lastCount = -1;
  let settledSince = Date.now();

  while (true) {
    window.scrollTo(0, document.documentElement.scrollHeight);
    await sleep(500);

    const count = playlistRoot().querySelectorAll(SELECTORS.item).length;
    if (count !== lastCount) {
      lastCount = count;
      settledSince = Date.now();
      updateOverlay(`Loaded ${count} videos`);
      // Keeps the extension's background worker awake during long syncs
      chrome.runtime.sendMessage({ type: "PROGRESS", count }).catch(() => {});
      if (stopWhen?.()) return false;
      continue;
    }

    const settleFor = spinnerVisible() ? SPINNER_SETTLE_MS : SETTLE_MS;
    if (Date.now() - settledSince > settleFor) return true;
  }
}

function endsWithKnownRun(videos, known) {
  if (videos.length < QUICK_SYNC_KNOWN_RUN) return false;
  return videos
    .slice(-QUICK_SYNC_KNOWN_RUN)
    .every((v) => known.has(v.videoId));
}

function playlistRoot() {
  return document.querySelector(SELECTORS.playlist) ?? document;
}

function spinnerVisible() {
  return [...document.querySelectorAll(SELECTORS.continuation)].some(
    (el) => el.getBoundingClientRect().height > 0,
  );
}

function readItems() {
  return [...playlistRoot().querySelectorAll(SELECTORS.item)]
    .map(readItem)
    .filter(Boolean);
}

function readItem(el) {
  const link = el.querySelector(SELECTORS.titleLink);
  const href = link?.getAttribute("href");
  if (!href) return null;

  const videoId = new URL(href, location.origin).searchParams.get("v");
  if (!videoId) return null;

  // Badges also show things like "SHORTS" or "LIVE", so only take a time
  const duration =
    [...el.querySelectorAll(SELECTORS.duration)]
      .map((badge) => badge.textContent.trim())
      .find((text) => /^\d+(:\d{2})+$/.test(text)) ?? "";

  return {
    videoId,
    title: link.textContent.trim() || "Unknown title",
    channel: el.querySelector(SELECTORS.channelLink)?.textContent.trim() ?? "",
    duration,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function findItem(videoId) {
  return [...playlistRoot().querySelectorAll(SELECTORS.item)].find(
    (el) => readItem(el)?.videoId === videoId,
  );
}

async function removeItem(el) {
  el.scrollIntoView({ block: "center" });
  el.querySelector(SELECTORS.menuButton)?.click();

  const option = await waitFor(() =>
    [...document.querySelectorAll(SELECTORS.menuItem)].find(
      (item) =>
        item.getBoundingClientRect().height > 0 &&
        SELECTORS.removeMenuText.test(item.textContent),
    ),
  );
  if (!option) {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    return false;
  }

  option.click();
  return Boolean(await waitFor(() => !el.isConnected || el.offsetParent === null));
}

async function waitFor(check, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = check();
    if (result) return result;
    await sleep(100);
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createBlockingOverlay(heading) {
  if (backdrop) return;

  backdrop = document.createElement("div");
  backdrop.id = "chipper-backdrop";

  Object.assign(backdrop.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0, 0, 0, 0.6)",
    zIndex: "999999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "all",
  });

  const modal = document.createElement("div");
  modal.id = "chipper-modal";

  Object.assign(modal.style, {
    background: "#111",
    color: "white",
    padding: "32px 40px",
    borderRadius: "12px",
    width: "420px",
    maxWidth: "90vw",
    textAlign: "center",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  });

  const title = document.createElement("h2");
  title.textContent = heading;
  Object.assign(title.style, {
    margin: "0 0 12px",
    fontSize: "20px",
    fontWeight: "600",
  });

  const subtext = document.createElement("div");
  subtext.textContent = "Please stay on this tab while we work our magic";
  Object.assign(subtext.style, {
    fontSize: "14px",
  });

  const status = document.createElement("div");
  status.id = "chipper-status";
  status.textContent = "Starting…";
  Object.assign(status.style, {
    fontSize: "14px",
    opacity: "0.85",
  });

  modal.appendChild(title);
  modal.appendChild(subtext);
  modal.appendChild(status);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Stops the user scrolling; the script can still scroll the page
  document.documentElement.style.overflow = "hidden";
}

function updateOverlay(text) {
  const status = document.getElementById("chipper-status");
  if (status) status.textContent = text;
}

function removeBlockingOverlay() {
  backdrop?.remove();
  backdrop = null;

  document.documentElement.style.overflow = "";
}
