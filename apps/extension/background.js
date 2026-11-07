const WATCH_LATER_URL = "https://www.youtube.com/playlist?list=WL";
const TASKS = ["SYNC_WATCH_LATER", "REMOVE_FROM_WATCH_LATER"];

// Requests from the Chipper web app
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  // Lets the app check the extension is installed
  if (msg?.type === "PING") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return;
  }
  if (!TASKS.includes(msg?.type)) return;

  runOnWatchLater(msg, sender.tab?.id)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err?.message ?? err) }));
  return true; // respond asynchronously
});

// Progress pings from the Watch Later page. Receiving them keeps this
// service worker alive while a long sync runs.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "PROGRESS") return;
});

async function runOnWatchLater(task, appTabId) {
  const tab = await chrome.tabs.create({ url: WATCH_LATER_URL, active: true });

  try {
    await waitForTabLoad(tab.id);
    return await sendTask(tab.id, task);
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
    if (appTabId) chrome.tabs.update(appTabId, { active: true });
  }
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const onUpdated = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

// The page script can take a moment to start after the tab loads
async function sendTask(tabId, task) {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await chrome.tabs.sendMessage(tabId, { type: "RUN_TASK", task });
    } catch (err) {
      if (!String(err?.message).includes("Receiving end does not exist")) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("Couldn't reach the Watch Later page");
}
