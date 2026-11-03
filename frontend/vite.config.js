// frontend/vite.config.js
// Owner: Aarian
// The proxy sends every /api request to the backend, so the browser never
// talks to port 5000 directly (no CORS problems on any port).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});