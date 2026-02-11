chrome.runtime.onMessageExternal.addListener(
  async (msg, chipper_sender, sendResponse) => {
    if (msg.type !== "START_CHIPPER_SCRIPT") return;

    startChipperScript();

    // Process Chipper Script
    chrome.runtime.onMessage.addListener(
      async (msg, yt_sender, _sendResponse) => {
        if (msg.type === "SCRIPT_COMPLETE") {
          chrome.tabs.remove(yt_sender.tab.id);
          chrome.tabs.update(chipper_sender.tab.id, { active: true });
          const data = await chrome.storage.local.get("chipper_result");
          sendResponse({ data: data });
        }
      },
    );
    return true;
  },
);

async function startChipperScript() {
  const tab = await chrome.tabs.create({
    url: "https://www.youtube.com/playlist?list=WL",
    active: true,
  });

  if (!tab.id) return;
  const tabId = tab.id;

  const onUpdated = (updatedTabId, info) => {
    if (updatedTabId === tabId && info.status === "complete") {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.sendMessage(tabId, {
        type: "TAB_READY",
      });
    }
  };

  chrome.tabs.onUpdated.addListener(onUpdated);
}
