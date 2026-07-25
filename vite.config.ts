import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

const buildLabel = new Date().toISOString()

export default defineConfig({
  define: {
    __BUILD_LABEL__: JSON.stringify(buildLabel),
  },
  build: {
    outDir: "build",
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      manifest: {
        name: "Benkyou",
        short_name: "Benkyou",
        description: "Japanese SRS study app",
        theme_color: "#1a1a2e",
        background_color: "#16213e",
        display: "standalone",
        start_url: "/",
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
})
