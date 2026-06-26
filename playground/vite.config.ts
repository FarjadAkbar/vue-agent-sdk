import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      // Use the SDK source directly for instant HMR during development.
      "@vue-agent-sdk/ui": fileURLToPath(
        new URL("../packages/agent-ui/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    proxy: {
      // Forward API calls to the Express server (see server/index.mjs).
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
