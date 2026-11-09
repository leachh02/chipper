// Addresses of self-hosted Chipper servers that the extension works with.
// localhost, 127.0.0.1 and the public site are built into the manifest;
// any other address is added on the options page, which asks the browser
// for access to it. That access is the list: nothing else is stored.

const BUILT_IN = new Set(
  chrome.runtime
    .getManifest()
    .content_scripts.flatMap((script) => script.matches)
    .concat(chrome.runtime.getManifest().host_permissions),
);

// "192.168.1.20:8080", "http://nas.local:8080/" or "https://chipper.example"
// -> "http://192.168.1.20/*". Match patterns can't name a port, so access
// covers every port on that host.
export function patternFor(address) {
  const text = address.trim();
  let url;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `http://${text}`);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname) return null;
  return `${url.protocol}//${url.hostname}/*`;
}

// "http://192.168.1.20/*" -> "http://192.168.1.20"
export function labelFor(pattern) {
  return pattern.replace(/\/\*$/, "");
}

export async function serverPatterns() {
  const { origins = [] } = await chrome.permissions.getAll();
  return origins.filter((origin) => !BUILT_IN.has(origin)).sort();
}

const BRIDGE_ID = "app-bridge-servers";

// Runs the app bridge on every added server, so the app there can reach the
// extension the same way it does in Firefox
export async function registerBridge() {
  const matches = await serverPatterns();
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [BRIDGE_ID] });
  if (registered.length) await chrome.scripting.unregisterContentScripts({ ids: [BRIDGE_ID] });
  if (!matches.length) return;
  await chrome.scripting.registerContentScripts([
    { id: BRIDGE_ID, matches, js: ["scripts/app-bridge.js"], runAt: "document_start" },
  ]);
}
