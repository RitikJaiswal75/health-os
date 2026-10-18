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
  server: {
    fs: { allow: [appRoot] },
  },
});
