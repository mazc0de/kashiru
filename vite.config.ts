import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // supabase-js + router + query ≈ 630 kB; kamera (zxing) sudah dipisah.
  build: { chunkSizeWarningLimit: 800 },
  server: { port: 9999 },
  preview: { port: 9999 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Kashiru',
        short_name: 'Kashiru',
        description: 'POS bengkel: kasir, cek stok, dan nota',
        lang: 'id',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Default + font Geist subset Latin agar tampilan tetap sama saat offline.
        globPatterns: ['**/*.{js,wasm,css,html}', 'assets/geist-*latin*-wght-normal-*.woff2'],
        // Data Supabase tidak di-cache oleh service worker; cache data ada di TanStack Query.
        runtimeCaching: [],
      },
    }),
  ],
})
