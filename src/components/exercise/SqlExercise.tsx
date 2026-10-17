'use client';

import { useState } from 'react';
import type { PublicExercise } from '@/domain/content/public-types';
import type { CellValue } from '@/domain/sql/result-fingerprint';
import { canonicalCell } from '@/domain/sql/result-fingerprint';
import type { Messages } from '@/i18n/messages';
import { apiJson } from '@/lib/client/api';
import { useAuth } from '@/lib/client/auth-context';
import type { QueryOutput } from '@/lib/client/duckdb-runner';
import { displayRows, fingerprint, runExerciseQuery } from '@/lib/client/duckdb-runner';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import styles from '@/components/lesson/interactive.module.css';

type Phase = 'idle' | 'running' | 'checking';

/** Affichage lisible ; la comparaison, elle, utilise toujours la forme canonique. */
function displayCell(cell: CellValue): string {
  if (typeof cell === 'number')
    return Number.isInteger(cell) ? cell.toFixed(0) : String(Math.round(cell * 1e6) / 1e6);
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return canonicalCell(cell);
}

interface CheckResponse {
  readonly passed: boolean;
}

export function SqlExercise({
  exercise,
  t,
}: {
  readonly exercise: PublicExercise;
  readonly t: Messages;
}) {
  const { ensureSession } = useAuth();
  const [sql, setSql] = useState(exercise.starterSql);
  const [phase, setPhase] = useState<Phase>('idle');
  const [output, setOutput] = useState<QueryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [engineLoaded, setEngineLoaded] = useState(false);

  async function run(): Promise<QueryOutput | null> {
    setPhase('running');
    setError(null);
    setPassed(null);
    try {
      const result = await runExerciseQuery(exercise.setupSql, exercise.table, sql);
      setEngineLoaded(true);
      setOutput(result);
      return result;
    } catch (e) {
      setOutput(null);
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setPhase('idle');
    }
  }

  async function check(): Promise<void> {
    const result = output ?? (await run());
    if (result === null) return;
    setPhase('checking');
    try {
      await ensureSession();
      const hash = await fingerprint(result, exercise.ordered);
      const response = await apiJson<CheckResponse>('POST', `/api/exercises/${exercise.id}/check`, {
        resultHash: hash,
      });
      setPassed(response.passed);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setPhase('idle');
    }
  }

  return (
    <section className={styles.panel} aria-labelledby={`exercise-${exercise.id}`}>
      <header className={styles.panelHeader}>
        <h2 id={`exercise-${exercise.id}`}>
          {t.exercise.title} : {exercise.title}
        </h2>
        <Badge tone="info">DuckDB-Wasm</Badge>
      </header>
      {exercise.statement.split(/\n{2,}/).map((paragraph) => (
        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
      ))}
      <p className={styles.statusLine}>
        {t.exercise.expected} : {exercise.expectedShape.columns.length} {t.exercise.columns} (
        {exercise.expectedShape.columns.join(', ')}), {exercise.expectedShape.rowCount}{' '}
        {t.exercise.rows}.
      </p>
      {exercise.hints.length > 0 && (
        <details>
          <summary>{t.exercise.hints}</summary>
          <ol>
            {exercise.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ol>
        </details>
      )}
      {exercise.dialectNotes.length > 0 && (
        <Callout kind="tip" title={t.exercise.dialect}>
          <ul>
            {exercise.dialectNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Callout>
      )}
      <label htmlFor={`sql-${exercise.id}`} className="visually-hidden">
        {t.exercise.editorLabel}
      </label>
      <textarea
        id={`sql-${exercise.id}`}
        className={styles.editor}
        value={sql}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(e) => {
          setSql(e.target.value);
          setOutput(null);
          setPassed(null);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            void run();
          }
        }}
      />
      <div className={styles.actions}>
        <Button onClick={() => void run()} disabled={phase !== 'idle'}>
          {t.exercise.run}
        </Button>
        <Button variant="secondary" onClick={() => void check()} disabled={phase !== 'idle'}>
          {t.exercise.check}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setSql(exercise.starterSql);
            setOutput(null);
            setPassed(null);
            setError(null);
          }}
        >
          {t.exercise.reset}
        </Button>
        {phase === 'running' && !engineLoaded && (
          <span className="muted">{t.exercise.loading}</span>
        )}
      </div>
      <p className={styles.statusLine}>{t.exercise.formative}</p>
      <div aria-live="polite">
        {passed === true && <Callout kind="tip">{t.exercise.passed}</Callout>}
        {passed === false && <Callout kind="warning">{t.exercise.failed}</Callout>}
        {error !== null && (
          <Callout kind="danger">
            <code>{error}</code>
          </Callout>
        )}
      </div>
      {output !== null && (
        <div className={styles.result}>
          <p className={styles.statusLine}>
            {output.rows.length} {t.exercise.rows} · {output.elapsedMs} ms
            {output.truncated && ` · ${t.exercise.truncated}`}
          </p>
          <table>
            <thead>
              <tr>
                {output.columns.map((c, i) => (
                  <th key={`${c}-${String(i)}`} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows(output).map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>
                      {cell === null ? <span className="muted">NULL</span> : displayCell(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
