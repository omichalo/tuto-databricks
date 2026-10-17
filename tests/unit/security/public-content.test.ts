import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXERCISE_KEYS, KEYS_CANARY, LAB_KEYS } from '@/generated/server/keys';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const publicContent = readFileSync(join(ROOT, 'src/generated/content.ts'), 'utf8');

describe('séparation contenu public / clés serveur', () => {
  it('le module public ne contient aucune clé de quiz', () => {
    expect(publicContent).not.toMatch(/"correct"\s*:/);
    expect(publicContent).not.toContain('explanation');
  });

  it('le module public ne contient ni empreinte attendue ni solution SQL', () => {
    for (const key of Object.values(EXERCISE_KEYS))
      expect(publicContent).not.toContain(key.expectedHash);
    expect(publicContent).not.toContain('solutionSql');
  });

  it('le module public ne contient ni code de contrôle ni corrigé de TP', () => {
    for (const key of Object.values(LAB_KEYS)) {
      expect(publicContent).not.toContain(key.checkCode);
      expect(publicContent).not.toContain(key.canary);
    }
    expect(publicContent).not.toContain(KEYS_CANARY);
  });

  it('le module des clés est marqué server-only', () => {
    expect(readFileSync(join(ROOT, 'src/generated/server/keys.ts'), 'utf8')).toContain(
      "import 'server-only'",
    );
  });

  it('les artefacts publics de TP n’incluent pas le corrigé', () => {
    const dir = join(ROOT, 'public/labs/delta-first-table');
    expect(existsSync(dir)).toBe(true);
    const files = readdirSync(dir);
    expect(files.some((f) => f.includes('solution'))).toBe(false);
    for (const file of files) {
      const text = readFileSync(join(dir, file), 'utf8');
      expect(text).not.toContain('DFT-43854');
      expect(text).not.toContain('CANARY-');
    }
  });
});
