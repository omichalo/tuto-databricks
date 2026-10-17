import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import type { DocumentData } from 'firebase-admin/firestore';

/**
 * Les documents du domaine portent des horodatages en millisecondes ; Firestore les stocke en
 * Timestamp (lisibles dans la console, utilisables pour les TTL). Convention : champs suffixés `At`.
 */
export function encode(doc: object): DocumentData {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc) as [string, unknown][]) {
    out[key] =
      key.endsWith('At') && typeof value === 'number' ? Timestamp.fromMillis(value) : value;
  }
  return out;
}

/**
 * Seul le serveur écrit ces documents (règles : écriture client refusée), toujours à partir des
 * types du domaine : la conversion de type est donc sûre.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function decode<T>(data: DocumentData | undefined): T | null {
  if (data === undefined) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data) as [string, unknown][]) {
    out[key] = value instanceof Timestamp ? value.toMillis() : value;
  }
  return out as T;
}
