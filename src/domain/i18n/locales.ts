export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Choisit la langue à partir d'un en-tête Accept-Language.
 * Le français est la langue de référence : il est retenu à défaut de correspondance.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (acceptLanguage === null || acceptLanguage.trim() === '') return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam === undefined ? 1 : Number.parseFloat(qParam.trim().slice(2));
      return { lang: tag.toLowerCase().split('-')[0] ?? '', q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.lang !== '' && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const entry of ranked) {
    if (isLocale(entry.lang)) return entry.lang;
  }
  return DEFAULT_LOCALE;
}
