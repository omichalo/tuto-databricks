import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('./src', import.meta.url));
const serverOnlyStub = fileURLToPath(
  new URL('./tests/support/server-only-stub.ts', import.meta.url),
);

const alias = { '@': src, 'server-only': serverOnlyStub };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
          environment: 'node',
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'emulators',
          include: ['tests/emulators/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
          env: {
            APP_ENV: 'test',
            CONTENT_MIN_STATUS: 'draft',
            LAB_MIN_STATUS: 'experimental',
            APP_CHECK_ENFORCED: 'false',
            GCLOUD_PROJECT: 'demo-tuto-databricks',
          },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/server/**', 'scripts/**'],
      reporter: ['text-summary', 'html'],
    },
  },
});
