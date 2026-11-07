import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
