import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Apenas o conteudo de `public/` e copiado para `dist`. Arquivos sensiveis da
  // raiz (package.json, package-lock.json, vite.config.js, .env) NUNCA entram no
  // build e portanto nao sao servidos publicamente.
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
});
