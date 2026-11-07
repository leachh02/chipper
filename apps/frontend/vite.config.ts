/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
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
    //remove for prod
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000", // Your Python server
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
