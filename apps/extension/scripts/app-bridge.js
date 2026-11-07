// Runs on the Chipper web app's own pages and passes its requests to the
// extension. Firefox doesn't let websites message extensions directly, so
// the app falls back to this when it can't reach the extension itself.
//
// The app posts { source: "chipper-app", id, message } to its window, and
// gets { source: "chipper-extension", id, response } back.
window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== "chipper-app") return;
  const { id, message } = event.data;

  const reply = (response) =>
    window.postMessage({ source: "chipper-extension", id, response }, window.location.origin);

  Promise.resolve(chrome.runtime.sendMessage(message))
    .then((response) => reply(response ?? { ok: false, error: "The Chipper extension didn't respond" }))
    .catch((err) => reply({ ok: false, error: String(err?.message ?? err) }));
});
