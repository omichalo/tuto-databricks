/**
 * Contrôles de la base de sécurité (CI) :
 * - versions épinglées et minimums de correctifs ;
 * - configuration Next.js (images non optimisées, en-têtes, pas de Server Actions) ;
 * - npm audit : aucune vulnérabilité en production, seules les exceptions dev documentées tolérées.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

interface Baseline {
  readonly pins: Readonly<Record<string, { readonly exact: string; readonly minPatched?: string }>>;
  readonly minimums: Readonly<Record<string, string>>;
  readonly acceptedAdvisories: readonly {
    readonly packages: readonly string[];
    readonly scope: 'dev';
    readonly reviewBy: string;
  }[];
}

interface AuditReport {
  readonly vulnerabilities?: Readonly<
    Record<string, { readonly severity: string; readonly isDirect: boolean }>
  >;
}

const baseline = JSON.parse(
  readFileSync(join(ROOT, 'config/security-baseline.json'), 'utf8'),
) as Baseline;
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
  overrides?: Record<string, string>;
};
const errors: string[] = [];

function compare(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((x) => Number.parseInt(x, 10));
  const pb = b.split(/[.-]/).map((x) => Number.parseInt(x, 10));
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function installedVersion(name: string): string | null {
  try {
    const p = JSON.parse(
      readFileSync(join(ROOT, 'node_modules', name, 'package.json'), 'utf8'),
    ) as { version: string };
    return p.version;
  } catch {
    return null;
  }
}

function allInstalledVersions(name: string, dir = join(ROOT, 'node_modules'), depth = 0): string[] {
  const out: string[] = [];
  if (depth > 6) return out;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (entry.startsWith('@')) {
      out.push(...allInstalledVersions(name, path, depth));
      continue;
    }
    const rel = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
    if (rel === name || rel.endsWith(`/${name}`)) {
      const v = installedVersion(path.slice(join(ROOT, 'node_modules').length + 1));
      if (v !== null) out.push(v);
    }
    const nested = join(path, 'node_modules');
    try {
      if (statSync(nested).isDirectory())
        out.push(...allInstalledVersions(name, nested, depth + 1));
    } catch {
      // pas de dépendances imbriquées
    }
  }
  return out;
}

for (const [name, pin] of Object.entries(baseline.pins)) {
  if (pkg.dependencies[name] !== pin.exact)
    errors.push(
      `${name} doit être épinglé exactement à ${pin.exact} (trouvé ${String(pkg.dependencies[name])})`,
    );
  const installed = installedVersion(name);
  if (installed !== pin.exact)
    errors.push(`${name} installé en ${String(installed)}, attendu ${pin.exact}`);
  if (pin.minPatched !== undefined && compare(pin.exact, pin.minPatched) < 0)
    errors.push(`${name} ${pin.exact} est antérieur au correctif ${pin.minPatched}`);
}

for (const [name, min] of Object.entries(baseline.minimums)) {
  for (const version of allInstalledVersions(name)) {
    if (compare(version, min) < 0) errors.push(`${name} ${version} installé : minimum ${min}`);
  }
}

const nextConfig = readFileSync(join(ROOT, 'next.config.ts'), 'utf8');
if (!/images:\s*\{\s*unoptimized:\s*true\s*\}/.test(nextConfig))
  errors.push('next.config.ts : images.unoptimized doit être true');
for (const header of [
  'Content-Security-Policy',
  'X-Content-Type-Options',
  "frame-ancestors 'none'",
  'Strict-Transport-Security',
]) {
  if (!nextConfig.includes(header)) errors.push(`next.config.ts : en-tête ${header} manquant`);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
for (const file of walk(join(ROOT, 'src')).filter((f) => /\.(ts|tsx)$/.test(f))) {
  const text = readFileSync(file, 'utf8');
  if (/^\s*['"]use server['"]/m.test(text))
    errors.push(`${file} : directive 'use server' interdite`);
  if (/from ['"]next\/og['"]/.test(text)) errors.push(`${file} : next/og interdit`);
}
if (readdirSync(join(ROOT, 'src')).some((f) => f.startsWith('middleware')))
  errors.push('middleware interdit par la base de sécurité');

function audit(omitDev: boolean): AuditReport {
  const args = ['audit', '--json', ...(omitDev ? ['--omit=dev'] : [])];
  try {
    return JSON.parse(
      execFileSync('npm', args, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    ) as AuditReport;
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout;
    if (stdout === undefined) throw error;
    return JSON.parse(stdout) as AuditReport;
  }
}

const today = new Date().toISOString().slice(0, 10);
const prod = audit(true);
for (const [name, v] of Object.entries(prod.vulnerabilities ?? {}))
  errors.push(`npm audit (production) : ${name} (${v.severity})`);
const accepted = new Set(baseline.acceptedAdvisories.flatMap((a) => a.packages));
for (const a of baseline.acceptedAdvisories) {
  if (a.reviewBy < today)
    errors.push(`exception ${a.packages.join(', ')} à réexaminer (échéance ${a.reviewBy})`);
}
const all = audit(false);
for (const [name, v] of Object.entries(all.vulnerabilities ?? {})) {
  if ((v.severity === 'high' || v.severity === 'critical') && !accepted.has(name)) {
    // Une vulnérabilité dev non documentée bloque aussi : elle doit être corrigée ou justifiée.
    errors.push(
      `npm audit (dev) : ${name} (${v.severity}) non documenté dans config/security-baseline.json`,
    );
  }
}

if (errors.length > 0) {
  console.error(`✗ base de sécurité :\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log('✓ base de sécurité respectée (versions, configuration, npm audit)');
