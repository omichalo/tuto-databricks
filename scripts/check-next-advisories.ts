/**
 * Contrôle des avis de sécurité publiés dans le dépôt vercel/next.js. Ils apparaissent souvent avant
 * leur intégration à la base globale utilisée par `npm audit`, et leurs plages de versions sont
 * parfois mal formées : la décision repose donc sur `patched_versions`.
 *
 * Une version est considérée vulnérable si l'avis propose un correctif sur la même ligne
 * majeure.mineure (ou, à défaut, la même majeure) strictement supérieur à la version installée.
 * Les avis sans correctif identifiable sur notre ligne sont listés « à examiner ».
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const ROOT = join(import.meta.dirname, '..');
const versionFlag = process.argv.indexOf('--version');
const installed =
  versionFlag > 0
    ? (process.argv[versionFlag + 1] ?? '')
    : z
        .object({ version: z.string() })
        .parse(JSON.parse(readFileSync(join(ROOT, 'node_modules', 'next', 'package.json'), 'utf8')))
        .version;

const advisorySchema = z.array(
  z.object({
    ghsa_id: z.string(),
    severity: z.string(),
    summary: z.string(),
    withdrawn_at: z.string().nullable().optional(),
    vulnerabilities: z
      .array(
        z.object({
          vulnerable_version_range: z.string().nullable().optional(),
          patched_versions: z.string().nullable().optional(),
        }),
      )
      .nullable(),
  }),
);

type Version = readonly [number, number, number];

function parse(v: string): Version | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compare(a: Version, b: Version): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

const current = parse(installed);
if (current === null) {
  console.error(`✗ version de next illisible : ${installed}`);
  process.exit(1);
}

async function fetchAll(): Promise<z.infer<typeof advisorySchema>> {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json' };
  const token = process.env.GITHUB_TOKEN;
  if (token !== undefined && token !== '') headers.authorization = `Bearer ${token}`;
  const all: z.infer<typeof advisorySchema> = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `https://api.github.com/repos/vercel/next.js/security-advisories?state=published&per_page=100&page=${String(page)}`,
      { headers },
    );
    if (!res.ok) throw new Error(`API GitHub : HTTP ${String(res.status)}`);
    const batch = advisorySchema.parse(await res.json());
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

const advisories = await fetchAll();
const vulnerable: string[] = [];
const toReview: string[] = [];

for (const a of advisories) {
  if (a.withdrawn_at != null) continue;
  const patched = (a.vulnerabilities ?? [])
    .flatMap((v) => (v.patched_versions ?? '').split(','))
    .map(parse)
    .filter((v): v is Version => v !== null);
  const sameMinor = patched.filter((p) => p[0] === current[0] && p[1] === current[1]);
  const sameMajor = patched.filter((p) => p[0] === current[0]);
  const line = sameMinor.length > 0 ? sameMinor : sameMajor;
  const label = `${a.ghsa_id} (${a.severity}) ${a.summary}`;
  if (line.length === 0) {
    const rangeMajors = (a.vulnerabilities ?? []).flatMap((v) =>
      [...(v.vulnerable_version_range ?? '').matchAll(/(\d+)\.\d+(?:\.\d+)?/g)].map((m) =>
        Number(m[1]),
      ),
    );
    const onlyHigherMajors = rangeMajors.length > 0 && rangeMajors.every((m) => m > current[0]);
    if (patched.length > 0 && patched.every((p) => p[0] > current[0]) && !onlyHigherMajors) {
      toReview.push(`${label} : correctif uniquement sur une majeure supérieure`);
    }
    continue;
  }
  if (line.every((p) => compare(p, current) > 0)) vulnerable.push(label);
}

console.log(
  `next ${installed} : ${String(advisories.length)} avis du dépôt vercel/next.js examinés`,
);
for (const r of toReview) console.warn(`  ? à examiner : ${r}`);
if (vulnerable.length > 0) {
  for (const v of vulnerable) console.error(`✗ non corrigé dans ${installed} : ${v}`);
  process.exit(1);
}
console.log(`✓ aucun avis non corrigé pour next ${installed}`);
