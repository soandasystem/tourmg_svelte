import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
/*
export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      '/proxy-api': {
        target: 'https://stingray-app-trnzb.ondigitalocean.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-api/, '/api')
      }
    }
  }
})
/*/
export default defineConfig({
  plugins: [svelte()],
  server: {
    // Permite que todos los subdominios de localhost accedan al servidor de desarrollo.
    // Necesario para el esquema multi-tenant basado en subdominios.
    allowedHosts: true,
    proxy: {
      '/proxy-api': {
        target: 'https://tourmanager-bnd.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy-api/, '/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Reemplazar el header Host para que el backend de render.com lo acepte correctamente
            proxyReq.setHeader('Host', 'tourmanager-bnd.onrender.com');
          });
        }
      }
    }
  }
})
