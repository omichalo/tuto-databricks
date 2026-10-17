import type { Metadata } from 'next';
import { AccountPanel } from '@/components/account/AccountPanel';
import { resolveLocale } from '@/components/layout/locale-params';
import { messagesFor } from '@/i18n/messages';

export const metadata: Metadata = { title: 'Compte', robots: { index: false } };

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = messagesFor(locale);
  return (
    <>
      <h1>{t.account.title}</h1>
      <AccountPanel t={t} />
    </>
  );
}
