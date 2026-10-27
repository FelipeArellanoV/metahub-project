import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: 'app.html',
        index: 'index.html'
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/cv': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
