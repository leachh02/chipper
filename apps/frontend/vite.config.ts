/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // The public site lives at leachh02.github.io/chipper/, so its build sets
  // VITE_BASE=/chipper/. Everything else is served from the root.
  base: process.env.VITE_BASE || "/",
  plugins: [react(), tailwindcss()],
  test: {
    setupFiles: ["src/test/setup.ts"],
    // Ignore your .env, so tests run the same here as in CI
    env: {
      VITE_EXTENSIONS_ID: "",
      VITE_SPOTIFY_CLIENT_ID: "",
      VITE_SPOTIFY_REDIRECT_URL: "",
      VITE_SPOTIFY_SCOPE: "",
      VITE_SPOTIFY_AUTHORIZATION_ENDPOINT: "",
      VITE_SPOTIFY_TOKEN_ENDPOINT: "",
      VITE_SERVER: "",
    },
  },
  // npm run preview, for running a production build on your own computer
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  server: {
    // Spotify only accepts 127.0.0.1 redirect URLs (not localhost), and the
    // redirect URL's port must match, so don't fall back to another port
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    // A Chipper server running from apps/server, for VITE_SERVER=true
    proxy: {
      "/api": "http://127.0.0.1:8080",
    },
  },
});
