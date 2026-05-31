import { defineConfig } from 'vitest/config';

// Test runner config. Vitest auto-loads this in preference to vite.config.ts, so
// the Tailwind/proxy app concerns stay out of the test environment.
//
// We deliberately do NOT add @vitejs/plugin-react here: Vitest bundles its own
// Vite (v5) whose Plugin types don't match the app's Vite (v6), which would make
// the config fail typecheck. esbuild's automatic JSX transform is all the tests
// need — no Fast Refresh required.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
