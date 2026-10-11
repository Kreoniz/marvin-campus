import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { campusPwa } from './pwa-build.ts';

export default defineConfig({
  plugins: [svelte(), tailwindcss(), campusPwa()],
  server: { proxy: { '/api': 'http://127.0.0.1:8080' } },
  build: { target: 'es2022' },
});
