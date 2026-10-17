import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LABS_DIR, ROOT } from './lab-files';

interface SensitivePattern {
  readonly id: string;
  readonly pattern: RegExp;
}

/** Motifs de données personnelles et de secrets interdits dans les artefacts de TP. */
export const SENSITIVE_PATTERNS: readonly SensitivePattern[] = [
  { id: 'email', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { id: 'phone-fr', pattern: /(?:\+33|\b0)[1-9](?:[ .-]?\d{2}){4}\b/ },
  { id: 'iban', pattern: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}\b/ },
  { id: 'databricks-pat', pattern: /\bdapi[a-f0-9]{32}\b/ },
  {
    id: 'databricks-workspace-url',
    pattern:
      /https:\/\/(?:[a-z0-9-]+\.)+(cloud\.databricks\.com|azuredatabricks\.net|gcp\.databricks\.com)/,
  },
  { id: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'private-key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: 'generic-secret', pattern: /(password|passwd|secret|token)\s*[:=]\s*["'][^"']{8,}["']/i },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

export function scanText(text: string): string[] {
  return SENSITIVE_PATTERNS.filter((p) => p.pattern.test(text)).map((p) => p.id);
}

export function scanLabs(): string[] {
  const errors: string[] = [];
  for (const file of walk(LABS_DIR)) {
    const hits = scanText(readFileSync(file, 'utf8'));
    for (const hit of hits)
      errors.push(`${relative(ROOT, file)} : motif sensible détecté (${hit})`);
  }
  return errors;
}
