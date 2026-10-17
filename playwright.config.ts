import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? '3100');
const remoteBaseURL = process.env.E2E_BASE_URL;
const baseURL = remoteBaseURL ?? `http://localhost:${String(port)}`;

/**
 * Tests de fumée. Par défaut : build de production local (`next start`) avec les émulateurs Auth et
 * Firestore déjà démarrés (CI : `firebase emulators:exec ... "npm run test:e2e"`).
 * `E2E_BASE_URL` cible un environnement déployé (staging) sans démarrer de serveur local.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI === undefined ? 0 : 1,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', locale: 'fr-FR' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(remoteBaseURL === undefined
    ? {
        webServer: {
          command: `npx next start -p ${String(port)}`,
          url: `${baseURL}/fr`,
          reuseExistingServer: process.env.CI === undefined,
          env: { APP_ORIGIN: baseURL },
          timeout: 120_000,
        },
      }
    : {}),
});
