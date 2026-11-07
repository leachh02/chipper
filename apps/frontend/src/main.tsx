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

initializeDefaults().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
