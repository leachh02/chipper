let backdrop = null;
let modal = null;

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "TAB_READY") {
    createBlockingOverlay();
    await scrollAndExtractVideosWithDebug().then(storeRawVideos);
    chrome.runtime.sendMessage({ type: "SCRIPT_COMPLETE" });
    removeBlockingOverlay();
  }
});

async function scrollAndExtractVideosWithDebug() {
  let prevVideoCount = 0;

  // Scroll until all videos are loaded
  while (true) {
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for new content to load

    // Count the number of loaded videos
    let videos = document.querySelectorAll("ytd-playlist-video-renderer");

    if (videos.length === prevVideoCount) break; // Exit if no new videos loaded
    updateOverlay(`Loaded ${videos.length} videos`);
    prevVideoCount = videos.length;
  }

  // Extract video data
  let videoElements = Array.from(
    document.querySelectorAll("ytd-playlist-video-renderer"),
  );
  let addedTime = Date.now();
  let data = videoElements.map((video, index) => {
    let title =
      video.querySelector("#video-title")?.textContent.trim() ||
      "Unknown Title";
    let link =
      "https://www.youtube.com" +
        video.querySelector("#video-title")?.getAttribute("href") || "#";
    let videoId = new URL(link).searchParams.get("v") || "unknown";
    let thumbnail =
      video.querySelector("#thumbnail a yt-image img")?.getAttribute("src") ||
      "";
    let duration =
      video.querySelector(".yt-badge-shape__text")?.textContent.trim() || "";
    let channel =
      video.querySelector("#channel-name #text a")?.textContent.trim() || "";
    return {
      videoId: videoId,
      title,
      channel,
      duration,
      url: link,
      thumbnail,
      addedAt: addedTime,
    };
  });

  return data;
}

async function storeRawVideos(videos) {
  await chrome.storage.local.set({
    chipper_result: {
      rawVideos: videos,
      addedAt: Date.now(),
      scriptVersion: "1.0.0",
    },
  });
}

function createBlockingOverlay() {
  if (backdrop) return;

  // 🔒 Backdrop
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

  // 🧱 Modal
  modal = document.createElement("div");
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
  title.textContent = "Syncing Chip List";
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

  // 🔒 Prevent scrolling
  document.documentElement.style.overflow = "hidden";
}

function updateOverlay(text) {
  const status = document.getElementById("chipper-status");
  if (status) status.textContent = text;
}

function removeBlockingOverlay() {
  backdrop?.remove();
  backdrop = null;
  modal = null;

  document.documentElement.style.overflow = "";
}
