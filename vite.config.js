import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['gate-icon.svg', 'gate-icon-192.png', 'gate-icon-512.png'],
      manifest: {
        name: 'Gate Control',
        short_name: 'Gate',
        description: 'Remote gate control for Bob Cox property',
        theme_color: '#1d4ed8',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'gate-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'gate-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'gate-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      // Proxy /go2rtc/ requests to the real go2rtc instance (avoids CORS)
      '/go2rtc': {
        target: process.env.VITE_GO2RTC_URL || 'http://192.168.0.201:1984',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/go2rtc/, ''),
      },
      // Proxy /ha-api/ to Home Assistant REST API (avoids CORS)
      '/ha-api': {
        target: process.env.VITE_HA_BASE_URL || 'http://192.168.0.201:8123',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ha-api/, ''),
      },
    },
  },
})
