import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxies API/upload requests to the Express server in dev so the client
// can just call relative paths ("/api/...") with no CORS juggling.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
});
