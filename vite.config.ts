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
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
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
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // Node 26's own localStorage global shadows jsdom's and is undefined
    // without a backing file, so the tests turn it off.
    poolOptions: {
      forks: { execArgv: ["--no-experimental-webstorage"] },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "app",
          exclude: ["src/features/media/**", "**/node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "media",
          include: ["src/features/media/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/features/media/test/setup.ts"],
        },
      },
    ],
  },
})
