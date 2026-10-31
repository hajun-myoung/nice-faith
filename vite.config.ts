import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
import tailwind from '@tailwindcss/vite';
export default defineConfig({
  plugins: [solid(), tailwind()],
  test: { environment: 'jsdom', setupFiles: ['./src/tests/setup.ts'], clearMocks: true },
});
