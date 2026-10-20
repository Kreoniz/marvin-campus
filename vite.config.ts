import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { campusPwa } from './pwa-build.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), campusPwa()],
  server: {
    proxy: { '/api': process.env.CAMPUS_API_ORIGIN ?? 'http://127.0.0.1:8080' },
  },
  build: { target: 'es2022' },
});
