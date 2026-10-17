import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountLink } from '@/components/layout/AccountLink';
import styles from '@/components/layout/layout.module.css';
import { resolveLocale } from '@/components/layout/locale-params';
import { PRODUCT } from '@/config/product';
import { LOCALES } from '@/domain/i18n/locales';
import { messagesFor } from '@/i18n/messages';
import { AuthProvider } from '@/lib/client/auth-context';
import '../globals.css';

export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return {
    title: { default: PRODUCT.name, template: `%s · ${PRODUCT.name}` },
    description: PRODUCT.tagline[locale],
    // Tant que le contenu anglais n'est pas traduit, les pages EN ne sont pas indexées.
    robots: locale === 'en' ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1220' },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const t = messagesFor(locale);
  const other = locale === 'fr' ? 'en' : 'fr';
  return (
    <html lang={locale}>
      <body>
        <a href="#main" className="skip-link">
          {t.nav.skip}
        </a>
        <AuthProvider>
          <header className={styles.header}>
            <div className={`container ${styles.headerInner}`}>
              <Link href={`/${locale}`} className={styles.brand}>
                <span className={styles.brandMark} aria-hidden="true">
                  ◆{' '}
                </span>
                {PRODUCT.name}
              </Link>
              <nav className={styles.nav} aria-label="Navigation principale">
                <Link href={`/${locale}/tracks`}>{t.nav.tracks}</Link>
                <Link href={`/${locale}/dashboard`}>{t.nav.dashboard}</Link>
                <Link href={`/${locale}/about`}>{t.nav.about}</Link>
              </nav>
              <div className={styles.tools}>
                <AccountLink locale={locale} label={t.nav.account} />
                <Link href={`/${other}`} hrefLang={other} lang={other}>
                  {other.toUpperCase()}
                </Link>
              </div>
            </div>
          </header>
          {locale === 'en' && (
            <div className={styles.banner} role="status">
              <div className="container">{t.enFallback}</div>
            </div>
          )}
          <main id="main" className={`container ${styles.main}`}>
            {children}
          </main>
          <footer className={styles.footer}>
            <div className="container">
              <p>{PRODUCT.disclaimer[locale]}</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
