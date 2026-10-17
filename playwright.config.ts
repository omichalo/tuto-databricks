import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? '3100');
const baseURL = `http://localhost:${String(port)}`;

/**
 * Tests de fumée sur le build de production, avec les émulateurs Auth et Firestore déjà démarrés
 * (CI : `firebase emulators:exec ... "npm run test:e2e"`). Aucun service cloud réel n'est appelé.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI === undefined ? 0 : 1,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', locale: 'fr-FR' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx next start -p ${String(port)}`,
    url: `${baseURL}/fr`,
    reuseExistingServer: process.env.CI === undefined,
    env: { APP_ORIGIN: baseURL },
    timeout: 120_000,
  },
});
