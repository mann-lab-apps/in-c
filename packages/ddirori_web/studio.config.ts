import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { fs: { allow: [fileURLToPath(new URL('../../', import.meta.url))] } },
  build: {
    outDir: '../../.tmp/ddirori-studio',
    rollupOptions: { input: fileURLToPath(new URL('./studio.html', import.meta.url)) },
  },
});
