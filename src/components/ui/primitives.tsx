import type { ReactNode } from 'react';
import styles from './ui.module.css';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'declared';

export function Badge({
  tone = 'neutral',
  children,
}: {
  readonly tone?: Tone;
  readonly children: ReactNode;
}) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

export function Card({
  title,
  children,
  as: Tag = 'section',
  headingLevel = 2,
}: {
  readonly title?: ReactNode;
  readonly children: ReactNode;
  readonly as?: 'section' | 'article' | 'div';
  readonly headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <Tag className={styles.card}>
      {title !== undefined && <Heading className={styles.cardTitle}>{title}</Heading>}
      {children}
    </Tag>
  );
}

export type CalloutKind = 'info' | 'tip' | 'warning' | 'danger';

export function Callout({
  kind = 'info',
  title,
  children,
}: {
  readonly kind?: CalloutKind;
  readonly title?: string;
  readonly children: ReactNode;
}) {
  const kindClass = kind === 'info' ? '' : (styles[`callout-${kind}`] ?? '');
  return (
    <aside className={`${styles.callout} ${kindClass}`} role="note">
      {title !== undefined && <strong className={styles.calloutTitle}>{title}</strong>}
      {children}
    </aside>
  );
}

export function ProgressBar({
  value,
  max,
  label,
}: {
  readonly value: number;
  readonly max: number;
  readonly label: string;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className={styles.progressBar} style={{ width: `${String(pct)}%` }} />
    </div>
  );
}
