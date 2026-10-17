'use client';

import { useState } from 'react';
import type { Messages } from '@/i18n/messages';
import { useAuth } from '@/lib/client/auth-context';
import { Button } from '@/components/ui/Button';
import { Callout, Card } from '@/components/ui/primitives';

export function AccountPanel({ t }: { readonly t: Messages }) {
  const { status, profile, signInWithGoogle, signOut } = useAuth();
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function google(abandonAnonymous: boolean): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle({ abandonAnonymous });
    setBusy(false);
    if (result.kind === 'account-exists') setConflict(true);
    else if (result.kind === 'error') setError(result.message);
    else if (result.kind === 'ok') setConflict(false);
  }

  if (status === 'loading') return <p className="muted">{t.common.loading}</p>;

  return (
    <div className="stack">
      <Card>
        {profile === null ? (
          <p>{t.account.none}</p>
        ) : profile.isAnonymous ? (
          <p>{t.account.anonymous}</p>
        ) : (
          <p>
            {t.account.google}{' '}
            {profile.displayName !== null && <strong>· {profile.displayName}</strong>}
          </p>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {(profile === null || profile.isAnonymous) && (
            <Button onClick={() => void google(false)} disabled={busy}>
              {profile?.isAnonymous === true ? t.account.linkGoogle : t.account.signInGoogle}
            </Button>
          )}
          {profile !== null && (
            <Button variant="secondary" onClick={() => void signOut()} disabled={busy}>
              {t.account.signOut}
            </Button>
          )}
        </div>
        {profile?.isAnonymous === true && (
          <p className="muted">{t.account.signOutAnonymousWarning}</p>
        )}
      </Card>
      {conflict && (
        <Callout kind="warning">
          <p>{t.account.accountExists}</p>
          <Button variant="secondary" onClick={() => void google(true)} disabled={busy}>
            {t.account.useExisting}
          </Button>
        </Callout>
      )}
      {error !== null && <Callout kind="danger">{error}</Callout>}
      <p className="muted">{t.account.data}</p>
    </div>
  );
}
