import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const appRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Dev-only icon gallery (/icons.html) renders the app's SVG icons directly.
    alias: {
      '@/src': `${appRoot}src`,
      'react-native-svg': fileURLToPath(new URL('./icons/react-native-svg-shim.tsx', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
        terms: fileURLToPath(new URL('./terms.html', import.meta.url)),
      },
    },
  },
  server: {
    fs: { allow: [appRoot] },
  },
});
