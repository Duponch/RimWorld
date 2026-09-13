import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: { port: 5173, strictPort: true },
  build: { target: 'es2023', rolldownOptions: { input: { game: 'index.html', navigation: 'navigation.html' } } },
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  test: {
    include: ['tests/**/*.test.ts'],
    // The deep colony scenarios are CPU-bound; avoid oversubscribing local cores.
    maxWorkers: 2,
    testTimeout: 30_000,
  },
});
