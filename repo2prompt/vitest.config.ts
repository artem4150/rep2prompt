import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./setupTests.ts'],
    exclude: ['tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@/components': resolve(__dirname, 'app/(shared)/components'),
      '@/hooks': resolve(__dirname, 'app/(shared)/hooks'),
      '@/api': resolve(__dirname, 'app/(shared)/services/api'),
      '@/state': resolve(__dirname, 'app/(shared)/state'),
      '@/i18n': resolve(__dirname, 'app/(shared)/i18n'),
      '@/utils': resolve(__dirname, 'app/(shared)/utils'),
      '@/mocks': resolve(__dirname, 'app/(shared)/mocks'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});
