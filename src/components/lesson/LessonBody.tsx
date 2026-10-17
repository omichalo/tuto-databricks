import { MDXRemote } from 'next-mdx-remote/rsc';
import type { ReactNode } from 'react';
import { isValidElement } from 'react';
import remarkGfm from 'remark-gfm';
import { headingSlug } from '@/domain/content/slug';
import type { CalloutKind } from '@/components/ui/primitives';
import { Callout } from '@/components/ui/primitives';
import styles from './lesson.module.css';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

const CALLOUT_KINDS = new Set<string>(['info', 'tip', 'warning', 'danger']);

const components = {
  h2: ({ children }: { children?: ReactNode }) => {
    const id = headingSlug(textOf(children));
    return (
      <h2 id={id} className={styles.anchored}>
        {children}
      </h2>
    );
  },
  h3: ({ children }: { children?: ReactNode }) => {
    const id = headingSlug(textOf(children));
    return (
      <h3 id={id} className={styles.anchored}>
        {children}
      </h3>
    );
  },
  table: ({ children }: { children?: ReactNode }) => (
    <div className={styles.tableWrap}>
      <table>{children}</table>
    </div>
  ),
  Callout: ({ kind, title, children }: { kind?: string; title?: string; children?: ReactNode }) => {
    const safeKind: CalloutKind =
      kind !== undefined && CALLOUT_KINDS.has(kind) ? (kind as CalloutKind) : 'info';
    return title === undefined ? (
      <Callout kind={safeKind}>{children}</Callout>
    ) : (
      <Callout kind={safeKind} title={title}>
        {children}
      </Callout>
    );
  },
};

/**
 * Le MDX vient du dépôt (contenu relu), jamais d'un apprenant ; les expressions JavaScript
 * restent bloquées (valeur par défaut de next-mdx-remote 6) par défense en profondeur.
 */
export function LessonBody({ source }: { readonly source: string }) {
  return (
    <div className={styles.prose}>
      <MDXRemote
        source={source}
        components={components}
        options={{
          blockJS: true,
          blockDangerousJS: true,
          mdxOptions: { remarkPlugins: [remarkGfm] },
        }}
      />
    </div>
  );
}
