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
  server: { port: 5173, host: true }
});
