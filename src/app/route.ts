import { negotiateLocale } from '@/domain/i18n/locales';

export const dynamic = 'force-dynamic';

/** La racine redirige vers la langue préférée du navigateur (français par défaut). */
export function GET(request: Request): Response {
  const locale = negotiateLocale(request.headers.get('accept-language'));
  return new Response(null, {
    status: 307,
    headers: {
      location: new URL(`/${locale}`, request.url).toString(),
      vary: 'Accept-Language',
      'cache-control': 'private, no-store',
    },
  });
}
