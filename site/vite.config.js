import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The site reads ../results, ../corpus, ../policy and ../lab at build time, so every number on the page is generated, never typed.
export default defineConfig({
  base: '/terraform-for-ai-infrastructure/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
