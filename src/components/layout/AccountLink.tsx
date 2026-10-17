'use client';

import Link from 'next/link';
import type { Locale } from '@/domain/i18n/locales';
import { useAuth } from '@/lib/client/auth-context';
import { Badge } from '@/components/ui/primitives';

export function AccountLink({
  locale,
  label,
}: {
  readonly locale: Locale;
  readonly label: string;
}) {
  const { status, profile } = useAuth();
  let state: string | null = null;
  if (status === 'signed-in' && profile !== null) {
    state = profile.isAnonymous
      ? locale === 'fr'
        ? 'anonyme'
        : 'anonymous'
      : (profile.displayName ?? 'Google');
  }
  return (
    <Link href={`/${locale}/account`}>
      {label}{' '}
      {state !== null && (
        <Badge tone={profile?.isAnonymous === true ? 'neutral' : 'success'}>{state}</Badge>
      )}
    </Link>
  );
}
