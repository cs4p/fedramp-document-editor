import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL ?? '/',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
});
