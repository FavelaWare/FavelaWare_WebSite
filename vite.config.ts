import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // O three.js (camiseta 3D da Home) fica num pedaço só dele, baixado sob
        // demanda: nunca no pacote principal. Passa do aviso de 500 KB do Vite de
        // propósito; o limite global não sobe para não esconder outros pedaços grandes.
        manualChunks: (id) => (id.includes('/node_modules/three/') ? 'three' : undefined),
      },
    },
  },
});
