import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    allowedHosts: ["localhost", "127.0.0.1", "demo.med-center.online"],
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
