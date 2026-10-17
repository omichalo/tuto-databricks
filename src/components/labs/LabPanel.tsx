'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LabProviderId } from '@/domain/labs/manifest-schema';
import type { SelfReportProviderId } from '@/domain/labs/providers';
import { SELF_REPORT_PROVIDERS } from '@/domain/labs/providers';
import type { FREE_EDITION_TERMS_NOTICE } from '@/domain/labs/terms';
import type {
  EnvironmentStatus,
  LabArtifactRef,
  LabInstructions,
  UnavailableReason,
  VerificationKind,
} from '@/domain/labs/types';
import type { LabProgressDoc } from '@/domain/progress/model';
import type { Messages } from '@/i18n/messages';
import { apiBlob, apiJson } from '@/lib/client/api';
import { useAuth } from '@/lib/client/auth-context';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import styles from '@/components/lesson/interactive.module.css';

export interface EnvironmentOption {
  readonly id: LabProviderId;
  readonly verification: VerificationKind;
  readonly available: boolean;
  readonly reason: UnavailableReason | null;
  readonly instructions: LabInstructions;
  readonly artifacts: readonly LabArtifactRef[];
  readonly status: EnvironmentStatus | null;
}

function isSelfReport(id: LabProviderId): id is SelfReportProviderId {
  return (SELF_REPORT_PROVIDERS as readonly string[]).includes(id);
}

function label(id: LabProviderId, t: Messages): string {
  switch (id) {
    case 'browser':
      return t.lab.browser;
    case 'databricks-free-manual':
      return t.lab.free;
    case 'professional-workspace':
      return t.lab.pro;
    case 'databricks-connected':
      return t.lab.connected;
  }
}

export function StatusBadge({
  status,
  t,
}: {
  readonly status: EnvironmentStatus;
  readonly t: Messages;
}) {
  if (status.effective === 'validated') return <Badge tone="success">✓ {t.lab.validated}</Badge>;
  if (status.effective === 'experimental')
    return <Badge tone="warning">{t.lab.experimental}</Badge>;
  return <Badge tone="danger">{t.lab.draft}</Badge>;
}

export function LabPanel({
  labId,
  labVersion,
  termsNotice,
  terms,
  options,
  browserHref,
  t,
}: {
  readonly labId: string;
  readonly labVersion: string;
  readonly termsNotice: string;
  readonly terms: typeof FREE_EDITION_TERMS_NOTICE;
  readonly options: readonly EnvironmentOption[];
  readonly browserHref: string | null;
  readonly t: Messages;
}) {
  const { status, profile, ensureSession, refreshProfile } = useAuth();
  const firstAvailable =
    options.find((o) => o.available && o.id !== 'browser') ?? options.find((o) => o.available);
  const [selected, setSelected] = useState<LabProviderId | null>(firstAvailable?.id ?? null);
  const [progress, setProgress] = useState<LabProgressDoc | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [cleanup, setCleanup] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: 'tip' | 'warning' | 'danger';
    text: string;
  } | null>(null);

  const option = options.find((o) => o.id === selected);
  const termsAccepted = profile?.acceptedFreeEditionTermsVersion === termsNotice;

  const loadProgress = useCallback(async () => {
    if (status !== 'signed-in') return;
    try {
      const { progress: p } = await apiJson<{ progress: LabProgressDoc | null }>(
        'GET',
        `/api/labs/${labId}/progress`,
      );
      setProgress(p);
    } catch {
      setProgress(null);
    }
  }, [labId, status]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  async function acceptTerms(): Promise<void> {
    setBusy(true);
    try {
      await ensureSession();
      await apiJson('POST', '/api/acknowledgements', {
        kind: 'free-edition-terms',
        version: termsNotice,
      });
      await refreshProfile();
    } catch (e) {
      setMessage({ tone: 'danger', text: e instanceof Error ? e.message : t.common.error });
    } finally {
      setBusy(false);
    }
  }

  async function report(provider: SelfReportProviderId): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      await ensureSession();
      const result = await apiJson<{ progress: LabProgressDoc | null }>(
        'POST',
        `/api/labs/${labId}/progress`,
        {
          provider,
          completed,
          checkCode: code.trim() === '' ? null : code.trim(),
          cleanupConfirmed: cleanup,
        },
      );
      setProgress(result.progress);
      const matched = result.progress?.checkCodeMatched;
      setMessage(
        matched === true
          ? { tone: 'tip', text: t.lab.codeMatched }
          : matched === false
            ? { tone: 'warning', text: t.lab.codeMismatch }
            : { tone: 'tip', text: t.lab.selfReported },
      );
    } catch (e) {
      setMessage({ tone: 'danger', text: e instanceof Error ? e.message : t.common.error });
    } finally {
      setBusy(false);
    }
  }

  async function downloadSolution(provider: SelfReportProviderId): Promise<void> {
    setBusy(true);
    try {
      await ensureSession();
      const blob = await apiBlob(`/api/labs/${labId}/solution`, { provider });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${labId}-solution.ipynb`;
      a.click();
      URL.revokeObjectURL(url);
      await loadProgress();
    } catch (e) {
      setMessage({ tone: 'danger', text: e instanceof Error ? e.message : t.common.error });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="lab-choose">
      <h2 id="lab-choose" style={{ marginTop: 0 }}>
        {t.lab.choose}
      </h2>
      <div className={styles.choices} role="group" aria-label={t.lab.choose}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={styles.envOption}
            aria-pressed={selected === o.id}
            disabled={!o.available}
            onClick={() => {
              setSelected(o.id);
              setMessage(null);
            }}
          >
            <span className={styles.envTitle}>{label(o.id, t)}</span>
            {o.status !== null && <StatusBadge status={o.status} t={t} />}{' '}
            {!o.available && (
              <Badge>{o.reason === 'not-implemented' ? t.lab.soon : t.lab.unavailable}</Badge>
            )}
            {o.verification === 'self-reported' && o.available && (
              <Badge tone="declared">{t.lab.selfReported}</Badge>
            )}
          </button>
        ))}
      </div>

      {progress !== null && (
        <Callout kind="info" title={t.lab.selfReported}>
          <p>
            {progress.status === 'reported-completed' ? '✓ ' : ''}
            {progress.provider} · v{progress.labVersion}
            {progress.cleanupConfirmed && ` · ${t.dashboard.cleanup}`}
            {progress.checkCodeMatched === true && ` · ${t.dashboard.code}`}
          </p>
          <p className="muted">{t.lab.selfReportedHelp}</p>
        </Callout>
      )}

      {option !== undefined && (
        <div className="stack" style={{ marginTop: 'var(--space-5)' }}>
          <h3>{option.instructions.heading}</h3>
          {option.status !== null && option.status.stale && (
            <Callout kind="warning">{t.lab.stale}</Callout>
          )}
          {option.status !== null &&
            option.status.effective === 'validated' &&
            option.status.validatedOn !== null && (
              <p>
                <Badge tone="success">
                  {t.lab.validatedOn} {option.status.validatedOn}
                </Badge>{' '}
                <span className="muted">{option.status.validatedEnvironment}</span>
              </p>
            )}
          {option.instructions.warnings.map((w) => (
            <Callout key={w} kind="warning">
              {w}
            </Callout>
          ))}
          <ol>
            {option.instructions.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>

          {option.id === 'browser' && browserHref !== null && (
            <ButtonLink href={browserHref}>{t.lab.openExercise}</ButtonLink>
          )}

          {option.id === 'databricks-free-manual' && !termsAccepted && (
            <Callout kind="info" title={t.lab.terms}>
              <ul>
                {terms.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p>
                <a href={terms.termsUrl} target="_blank" rel="noopener noreferrer">
                  {t.lab.terms}
                </a>{' '}
                ·{' '}
                <a href={terms.limitsUrl} target="_blank" rel="noopener noreferrer">
                  Free Edition limitations
                </a>
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => {
                    setTermsChecked(e.target.checked);
                  }}
                />{' '}
                {t.lab.acceptTerms}
              </label>
              <div className={styles.actions}>
                <Button onClick={() => void acceptTerms()} disabled={!termsChecked || busy}>
                  {t.lab.acceptTerms}
                </Button>
              </div>
            </Callout>
          )}

          {isSelfReport(option.id) && (option.id !== 'databricks-free-manual' || termsAccepted) && (
            <>
              <ul className={styles.artifacts}>
                {option.artifacts.map((a) => (
                  <li key={a.href}>
                    <a href={a.href} download={a.fileName}>
                      {t.lab.download} {a.fileName}
                    </a>
                    <span className={styles.hash} title="SHA-256">
                      sha256 {a.sha256.slice(0, 16)}…
                    </span>
                  </li>
                ))}
              </ul>

              <h3>{t.lab.report}</h3>
              {status !== 'signed-in' && <p className="muted">{t.lab.signInRequired}</p>}
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isSelfReport(option.id)) void report(option.id);
                }}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={(e) => {
                      setCompleted(e.target.checked);
                    }}
                  />
                  {t.lab.completedQuestion}
                </label>
                <label htmlFor="check-code" style={{ flexDirection: 'column' }}>
                  {t.lab.checkCode}
                  <input
                    id="check-code"
                    className={styles.input}
                    value={code}
                    maxLength={32}
                    placeholder="XXX-00000"
                    autoComplete="off"
                    onChange={(e) => {
                      setCode(e.target.value);
                    }}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={cleanup}
                    onChange={(e) => {
                      setCleanup(e.target.checked);
                    }}
                  />
                  {t.lab.cleanupDone}
                </label>
                <p className="muted">{t.lab.selfReportedHelp}</p>
                <div className={styles.actions}>
                  <Button type="submit" disabled={busy}>
                    {t.lab.send}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      if (isSelfReport(option.id)) void downloadSolution(option.id);
                    }}
                  >
                    {t.lab.solution}
                  </Button>
                </div>
                <p className="muted">
                  {t.lab.solutionWarning} (version {labVersion})
                </p>
              </form>
            </>
          )}
          <div aria-live="polite">
            {message !== null && <Callout kind={message.tone}>{message.text}</Callout>}
          </div>
        </div>
      )}
    </section>
  );
}
