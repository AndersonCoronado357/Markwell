import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    // Externaliza dependencias de Node (incl. módulos nativos como better-sqlite3)
    // para que no se empaqueten en el bundle.
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    // Puerto fijo (6175) para que no varíe entre arranques.
    server: { port: 6175, strictPort: true },
    plugins: [react(), tailwindcss()],
  },
});
