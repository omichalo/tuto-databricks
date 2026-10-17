import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

function classes(variant: Variant, extra?: string): string {
  return [styles.button, styles[variant], extra].filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { readonly variant?: Variant }) {
  return <button type={type} className={classes(variant, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = 'primary',
  children,
}: {
  readonly href: string;
  readonly variant?: Variant;
  readonly children: ReactNode;
}) {
  return (
    <Link href={href} className={classes(variant)}>
      {children}
    </Link>
  );
}
