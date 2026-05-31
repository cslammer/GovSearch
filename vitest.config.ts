import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Test runner config. Vitest auto-loads this in preference to vite.config.ts, so
// the Tailwind/proxy app concerns stay out of the test environment.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
