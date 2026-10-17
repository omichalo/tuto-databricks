/**
 * Copie les bundles DuckDB-Wasm dans public/vendor/duckdb/<version>/ : ils sont servis depuis
 * l'origine de l'application (CSP 'self'), sans CDN tiers. Le chemin versionné permet un cache long.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'node_modules', '@duckdb', 'duckdb-wasm', 'dist');
const pkg = JSON.parse(
  readFileSync(join(ROOT, 'node_modules', '@duckdb', 'duckdb-wasm', 'package.json'), 'utf8'),
) as { version: string };
const OUT_ROOT = join(ROOT, 'public', 'vendor', 'duckdb');
const OUT = join(OUT_ROOT, pkg.version);
const FILES = [
  'duckdb-mvp.wasm',
  'duckdb-eh.wasm',
  'duckdb-browser-mvp.worker.js',
  'duckdb-browser-eh.worker.js',
];

if (FILES.every((f) => existsSync(join(OUT, f)))) {
  console.log(`✓ DuckDB-Wasm ${pkg.version} déjà présent`);
} else {
  rmSync(OUT_ROOT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const file of FILES) copyFileSync(join(DIST, file), join(OUT, file));
  console.log(`✓ DuckDB-Wasm ${pkg.version} copié dans public/vendor/duckdb/${pkg.version}`);
}
