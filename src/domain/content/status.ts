export const CONTENT_STATUSES = [
  'draft',
  'in-technical-review',
  'in-pedagogical-review',
  'published',
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number] | 'deprecated';

export const TRANSLATION_STATUSES = [
  'missing',
  'draft',
  'in-review',
  'complete',
  'outdated',
] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];

/** Un contenu est visible si son statut atteint au moins le seuil configuré pour l'environnement. */
export function isContentVisible(
  status: ContentStatus,
  minStatus: (typeof CONTENT_STATUSES)[number],
): boolean {
  if (status === 'deprecated') return false;
  return CONTENT_STATUSES.indexOf(status) >= CONTENT_STATUSES.indexOf(minStatus);
}

export function parseContentMinStatus(raw: string | undefined): (typeof CONTENT_STATUSES)[number] {
  const value = (raw ?? 'published') as (typeof CONTENT_STATUSES)[number];
  return CONTENT_STATUSES.includes(value) ? value : 'published';
}
