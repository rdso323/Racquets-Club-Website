import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['new_logo.png'],
      manifest: {
        name: 'Fuqua Racquets Club',
        short_name: 'Racquets',
        description: 'Your central hub for Fuqua Racquets news, social events, and court bookings.',
        theme_color: '#001A57',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/new_logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/new_logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
