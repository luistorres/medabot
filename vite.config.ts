import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: ["playwright", "playwright-core", "better-sqlite3"],
  },
  ssr: {
    external: ["playwright", "playwright-core", "better-sqlite3"],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      srcDirectory: "app",
    }),
    viteReact(),
    nitro({
      // Keep server-only native packages out of the bundle
      rollupConfig: {
        external: [/^playwright/, /^chromium-bidi/, /^pdf-parse/, /^better-sqlite3/],
      },
    }),
  ],
  publicDir: "public",
});
