import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "VueAgentSdkUI",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      // Don't bundle peer deps into the library output.
      external: ["vue"],
      output: {
        globals: { vue: "Vue" },
        // Emit a single, predictable stylesheet name (matches the
        // "./styles.css" export in package.json).
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] ?? assetInfo.name ?? "";
          if (name.endsWith(".css")) return "styles.css";
          return "[name][extname]";
        },
      },
    },
    cssCodeSplit: false,
  },
});
