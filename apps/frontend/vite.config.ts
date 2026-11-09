/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// A build for the Chipper server loads the server's settings (see
// src/config.ts) before the app starts
function serverConfig(): Plugin {
  return {
    name: "chipper-server-config",
    transformIndexHtml: () => [
      { tag: "script", attrs: { src: "/config.js" }, injectTo: "head" },
    ],
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // The public site lives at leachh02.github.io/chipper/, so its build sets
  // VITE_BASE=/chipper/. Everything else is served from the root.
  base: process.env.VITE_BASE || "/",
  plugins: [
    react(),
    tailwindcss(),
    ...(loadEnv(mode, process.cwd(), "VITE_").VITE_SERVER === "true" ? [serverConfig()] : []),
  ],
  build: {
    rollupOptions: {
      output: {
        // React and the router change far less often than Chipper, so a
        // browser keeps them cached across updates
        manualChunks: (id) =>
          /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
            ? "vendor"
            : undefined,
      },
    },
    // react-player's HLS and DASH players are over this, but they're only
    // downloaded for those kinds of video, never for YouTube
    chunkSizeWarningLimit: 1000,
  },
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
    // A Chipper server running from apps/backend, for VITE_SERVER=true
    proxy: {
      "/api": "http://127.0.0.1:8080",
      "/config.js": "http://127.0.0.1:8080",
    },
  },
}));
