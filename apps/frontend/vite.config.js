import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Escribe un identificador de compilación en dist/sw.js para que cada despliegue
// use un caché nuevo del service worker y descarte el anterior.
function serviceWorkerVersion() {
  let outDir = 'dist';
  return {
    name: 'metahub-sw-version',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    closeBundle() {
      const file = resolve(outDir, 'sw.js');
      if (!existsSync(file)) return;
      const id = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      writeFileSync(file, readFileSync(file, 'utf8').replace("const VERSION = '__BUILD_ID__'", "const VERSION = '" + id + "'"));
    }
  };
}

// Única entrada: index.html (SPA React). Los prototipos estáticos viven en legacy/ y no se compilan.
export default defineConfig({
  plugins: [react(), serviceWorkerVersion()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Todo /api (incluido /api/cv) pasa por la API, que autentica y reenvía al servicio de visión.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
