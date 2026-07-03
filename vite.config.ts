import { defineConfig, type Plugin } from 'vite'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** In locale: "/". Su GitHub Pages: "/nome-repo/" (vedi .github/workflows/deploy.yml) */
const base = process.env.VITE_BASE_PATH || '/'

function appVersionJsonPlugin(): Plugin {
  return {
    name: 'app-version-json',
    closeBundle() {
      const build = process.env.VITE_APP_BUILD || 'dev'
      writeFileSync(
        join(process.cwd(), 'dist', 'version.json'),
        JSON.stringify({ build }),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    appVersionJsonPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'pwa-icon.svg', 'pwa-maskable.svg'],
      manifest: {
        id: base,
        name: 'Note Personali',
        short_name: 'Note',
        description: 'Note, impegni e spese — funziona offline sul dispositivo',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        lang: 'it',
        dir: 'ltr',
        start_url: base,
        scope: base,
        categories: ['productivity', 'finance'],
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: `${base}index.html`.replace(/\/{2,}/g, '/'),
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /version\.json(?:\?.*)?$/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
