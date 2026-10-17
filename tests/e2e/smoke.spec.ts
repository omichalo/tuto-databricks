import { expect, test } from '@playwright/test';

const LESSON = '/fr/tracks/databricks-sql-delta/requetes-agregations';

test('la racine redirige selon la langue du navigateur', async ({ request }) => {
  const res = await request.get('/', {
    maxRedirects: 0,
    headers: { 'accept-language': 'en-US,en;q=0.9' },
  });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toMatch(/\/en$/);
});

test('les en-têtes de sécurité sont présents', async ({ request }) => {
  const res = await request.get('/fr');
  const headers = res.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('les fichiers DuckDB-Wasm versionnés sont mis en cache durablement', async ({ request }) => {
  const res = await request.get('/vendor/duckdb/1.32.0/duckdb-browser-eh.worker.js');
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});

test('une écriture depuis une origine étrangère est refusée', async ({ request }) => {
  const res = await request.post('/api/progress/lessons', {
    headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
    data: { trackId: 'databricks-sql-delta', lessonId: 'requetes-agregations', action: 'complete' },
  });
  expect(res.status()).toBe(403);
});

test('exercice DuckDB-Wasm : exécution, contrôle formatif et progression', async ({ page }) => {
  await page.goto(LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Interroger et agréger avec SQL',
  );

  const editor = page.getByLabel('Requête SQL');
  await page.getByRole('button', { name: 'Exécuter' }).click();
  await expect(page.locator('section[aria-labelledby^="exercise"] table')).toContainText('FR');

  await editor.fill(
    [
      'select country, count(*) as n, round(sum(amount_cents) / 100.0, 2) as eur',
      'from orders',
      "where status = 'delivered'",
      'group by country',
      'having sum(amount_cents) > 1460000',
      'order by eur desc',
    ].join('\n'),
  );
  await page.getByRole('button', { name: 'Vérifier le résultat' }).click();
  await expect(page.getByText('Résultat correct : il correspond à la solution.')).toBeVisible();
  await expect(page.locator('section[aria-labelledby^="exercise"] table')).toContainText(
    '14703.24',
  );

  await page.getByRole('button', { name: 'Marquer comme terminée' }).click();
  await expect(page.getByText('Leçon terminée')).toBeVisible();
});

test('une requête interdite (accès externe) est rejetée par le moteur du navigateur', async ({
  page,
}) => {
  await page.goto(LESSON);
  await page.getByLabel('Requête SQL').fill("SELECT * FROM read_csv('https://example.com/x.csv')");
  await page.getByRole('button', { name: 'Exécuter' }).click();
  await expect(
    page.locator('section[aria-labelledby^="exercise"] [role="note"] code'),
  ).toBeVisible();
});

test('TP Free Edition : statut expérimental et déclaration distincte', async ({ page }) => {
  await page.goto('/fr/labs/delta-first-table');
  await expect(page.getByRole('button', { name: /Databricks Free Edition/ })).toContainText(
    'Expérimental',
  );
  await expect(page.getByRole('button', { name: /Workspace connecté/ })).toBeDisabled();
  await expect(page.getByText('TP expérimental : il n’a pas encore été validé')).toBeVisible();

  await page.getByRole('checkbox', { name: 'J’ai lu ces conditions et je les respecte' }).check();
  await page.getByRole('button', { name: 'J’ai lu ces conditions et je les respecte' }).click();
  await expect(page.getByRole('link', { name: /delta-first-table-exercise\.ipynb/ })).toBeVisible();

  await page
    .getByRole('checkbox', { name: 'J’ai exécuté toutes les cellules de l’exercice' })
    .check();
  await page.getByLabel('Code de contrôle affiché par le notebook').fill('DFT-43854');
  await page.getByRole('checkbox', { name: /notebook de nettoyage/ }).check();
  await page.getByRole('button', { name: 'Enregistrer ma déclaration' }).click();
  await expect(page.getByText('indice de cohérence, pas une preuve')).toBeVisible();

  await page.goto('/fr/dashboard');
  await expect(page.getByRole('heading', { name: 'Déclaré par vous' })).toBeVisible();
  await expect(page.getByText(/Déclaré par vous · databricks-free-manual/)).toBeVisible();
});
