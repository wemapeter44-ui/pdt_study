
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: ['pdt-study-icon.png'],

      manifest: {
        id: '/',
        name: 'PDT Study',
        short_name: 'PDT Study',
        description: 'Learn. Practice. Excel.',
        theme_color: '#080F1C',
        background_color: '#080F1C',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',

        icons: [
          {
            src: '/pdt-study-icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pdt-study-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },

      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
