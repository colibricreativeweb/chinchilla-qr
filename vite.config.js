import { defineConfig } from 'vite';  
import react from '@vitejs/plugin-react';  
import { VitePWA } from 'vite-plugin-pwa';  

export default defineConfig({  
  plugins: [  
    react(),  
    VitePWA({  
      registerType: 'autoUpdate',  
      manifest: {  
        name: 'Chinchilla QR',  
        short_name: 'ChinchillaQR',  
        description: 'A simple and powerful QR code generator.',  
        start_url: '/',  
        display: 'standalone',  
        background_color: '#ffffff',  
        lang: "en",
        scope: "/",
        icons: [  
          {  
            purpose: 'maskable',  
            sizes: '48x48',  
            src: 'maskable_icon_x48.png',  
            type: 'image/png'  
          },  
          {  
            purpose: 'any',  
            sizes: '192x192',  
            src: 'maskable_icon_x192.png',  
            type: 'image/png'  
          },
          {  
            purpose: 'any',  
            sizes: '512x512',  
            src: 'maskable_icon_x512.png',  
            type: 'image/png'  
          },
          {  
            purpose: 'maskable',  
            sizes: '192x192',  
            src: 'maskable_icon_x192-m.png',  
            type: 'image/png'  
          },
          {  
            purpose: 'maskable',  
            sizes: '512x512',  
            src: 'maskable_icon_x512-m.png',  
            type: 'image/png'  
          }  
        ],
        theme_color: '#4F46E5',  
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
