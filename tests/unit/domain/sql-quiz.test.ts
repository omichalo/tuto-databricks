import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { gradeQuiz } from '@/domain/quiz/grade';
import type { QuizKeyQuestion } from '@/domain/quiz/grade';
import { assertPortableGenerator, renderGenerator } from '@/domain/sql/generator-dialect';
import { canonicalCell, canonicalResult, fingerprintResult } from '@/domain/sql/result-fingerprint';
import { datasetSetupSql, runOnDataset, sha256Hex } from '../../../scripts/content/exercise-runner';
import { EXERCISE_KEYS } from '@/generated/server/keys';
import { EXERCISES } from '@/generated/content';
import { loadContent } from '../../../scripts/content/load-content';

async function webSha256(text: string): Promise<string> {
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Buffer.from(digest).toString('hex');
}

describe('empreinte de résultat', () => {
  it('traite de la même façon BIGINT, nombre et chaîne numérique', () => {
    expect(canonicalCell(1460000n)).toBe(canonicalCell(1460000));
    expect(canonicalCell('12.5')).toBe(canonicalCell(12.5));
    expect(canonicalCell(12.5)).toBe('12.500000');
    expect(canonicalCell(null)).toBe('∅');
  });

  it('ignore l’ordre des lignes seulement si la requête n’est pas ordonnée', () => {
    const a = [
      ['FR', 1],
      ['DE', 2],
    ];
    const b = [
      ['DE', 2],
      ['FR', 1],
    ];
    expect(canonicalResult(a, 2, false)).toBe(canonicalResult(b, 2, false));
    expect(canonicalResult(a, 2, true)).not.toBe(canonicalResult(b, 2, true));
  });

  it('ne dépend pas des noms de colonnes mais de leur nombre', () => {
    expect(canonicalResult([['x']], 1, true)).not.toBe(canonicalResult([['x', null]], 2, true));
  });

  it('le calcul navigateur (WebCrypto) et le calcul CI (node:crypto) donnent la même empreinte', async () => {
    const rows = [['FR', 1n, 3.25]];
    const browser = await fingerprintResult(rows, 3, true, webSha256);
    expect(browser).toBe(sha256Hex(canonicalResult(rows, 3, true)));
  });
});

describe('exercice pilote', () => {
  it('la solution exécutée dans DuckDB correspond à l’empreinte attendue côté serveur', async () => {
    const content = loadContent();
    for (const [id, exercise] of content.exercises) {
      const result = await runOnDataset(exercise, exercise.solutionSql);
      const hash = await fingerprintResult(
        result.rows,
        result.columns.length,
        exercise.ordered,
        webSha256,
      );
      expect(hash).toBe(EXERCISE_KEYS[id]?.expectedHash);
    }
  });

  it('la requête de départ ne passe pas la vérification', async () => {
    const content = loadContent();
    for (const [id, exercise] of content.exercises) {
      const result = await runOnDataset(exercise, exercise.starterSql);
      const hash = sha256Hex(canonicalResult(result.rows, result.columns.length, exercise.ordered));
      expect(hash).not.toBe(EXERCISE_KEYS[id]?.expectedHash);
    }
  });

  it('le SQL d’initialisation publié est celui du générateur commun', () => {
    for (const [id, exercise] of loadContent().exercises) {
      expect(EXERCISES.find((e) => e.id === id)?.setupSql).toBe(datasetSetupSql(exercise));
    }
  });
});

describe('générateur portable', () => {
  const source =
    "CREATE TABLE {{TARGET}} AS SELECT id, {{DATE_ADD(DATE '2026-01-01', id % 3)}} AS d FROM {{IDS(ROWS)}}";

  it('rend la même logique pour Spark et DuckDB', () => {
    const spark = renderGenerator(source, { dialect: 'spark', target: 't', rows: 10 });
    const duck = renderGenerator(source, { dialect: 'duckdb', target: 't', rows: 10 });
    expect(spark).toContain('date_add(');
    expect(duck).toContain('AS DATE)');
    expect(spark).toContain('t');
  });

  it('refuse les fonctions non déterministes', () => {
    expect(() => {
      assertPortableGenerator('SELECT rand() FROM x');
    }).toThrow();
    expect(() => {
      assertPortableGenerator('SELECT uuid()');
    }).toThrow();
    expect(() => {
      assertPortableGenerator('SELECT current_date()');
    }).toThrow();
  });
});

describe('correction de quiz', () => {
  const questions: QuizKeyQuestion[] = [
    {
      id: 'q1',
      kind: 'single',
      choices: [
        { id: 'a', correct: true, explanation: 'oui' },
        { id: 'b', correct: false, explanation: 'non' },
      ],
      sectionAnchor: 'section',
    },
    {
      id: 'q2',
      kind: 'multiple',
      choices: [
        { id: 'a', correct: true, explanation: '1' },
        { id: 'b', correct: true, explanation: '2' },
        { id: 'c', correct: false, explanation: '3' },
      ],
    },
  ];

  it('exige toutes les bonnes réponses et rien d’autre pour une question multiple', () => {
    expect(gradeQuiz(questions, { q1: ['a'], q2: ['a', 'b'] }).score).toBe(2);
    expect(gradeQuiz(questions, { q1: ['a'], q2: ['a'] }).score).toBe(1);
    expect(gradeQuiz(questions, { q1: ['a'], q2: ['a', 'b', 'c'] }).score).toBe(1);
  });

  it('ignore les choix inconnus et les doublons', () => {
    expect(gradeQuiz(questions, { q1: ['a', 'a', 'zzz'], q2: ['b', 'a'] }).score).toBe(2);
  });

  it('explique chaque choix et renvoie vers la section', () => {
    const grade = gradeQuiz(questions, { q1: ['b'] });
    expect(grade.feedback[0]?.explanations).toEqual({ a: 'oui', b: 'non' });
    expect(grade.feedback[0]?.sectionAnchor).toBe('section');
    expect(grade.feedback[1]?.correct).toBe(false);
  });
});
