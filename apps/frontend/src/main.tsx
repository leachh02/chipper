import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initializeDefaults } from "./db/init.ts";

// Saved data and the Spotify sign-in are kept per origin, so keep everything
// on 127.0.0.1 rather than splitting it between that and localhost
if (import.meta.env.DEV && window.location.hostname === "localhost") {
  window.location.hostname = "127.0.0.1";
}

// Offline support for the installed app. Skipped in development, where it
// would serve stale files.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

// Once installed to the home screen, ask the browser not to clear Chipper's data
if (window.matchMedia("(display-mode: standalone)").matches) {
  navigator.storage?.persist?.().catch(() => {});
}

initializeDefaults().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
