import { notFound } from 'next/navigation';
import type { Locale } from '@/domain/i18n/locales';
import { isLocale } from '@/domain/i18n/locales';

export type LocaleParams = Promise<{ locale: string }>;

export async function resolveLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}
