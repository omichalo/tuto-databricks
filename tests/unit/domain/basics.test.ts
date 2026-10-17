import { describe, expect, it } from 'vitest';
import { headingSlug } from '@/domain/content/slug';
import { isContentVisible, parseContentMinStatus } from '@/domain/content/status';
import { isLocale, negotiateLocale } from '@/domain/i18n/locales';
import { effectiveLabStatus, isLabStatusVisible, parseLabMinStatus } from '@/domain/labs/status';

describe('locales', () => {
  it('reconnaît les locales prises en charge', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('de')).toBe(false);
  });

  it('négocie la langue du navigateur, français par défaut', () => {
    expect(negotiateLocale(null)).toBe('fr');
    expect(negotiateLocale('en-US,en;q=0.9')).toBe('en');
    expect(negotiateLocale('de-DE,de;q=0.9')).toBe('fr');
    expect(negotiateLocale('fr-CA,en;q=0.5')).toBe('fr');
  });
});

describe('statuts de contenu', () => {
  it('masque les contenus sous le seuil', () => {
    expect(isContentVisible('in-technical-review', 'published')).toBe(false);
    expect(isContentVisible('in-technical-review', 'in-technical-review')).toBe(true);
    expect(isContentVisible('draft', 'draft')).toBe(true);
    expect(isContentVisible('published', 'draft')).toBe(true);
  });

  it('retombe sur published si la variable est absente ou invalide', () => {
    expect(parseContentMinStatus(undefined)).toBe('published');
    expect(parseContentMinStatus('n-importe-quoi')).toBe('published');
    expect(parseContentMinStatus('draft')).toBe('draft');
  });
});

describe('statuts de TP', () => {
  it('ordonne draft < experimental < validated', () => {
    expect(isLabStatusVisible('experimental', 'validated')).toBe(false);
    expect(isLabStatusVisible('validated', 'experimental')).toBe(true);
    expect(isLabStatusVisible('draft', 'experimental')).toBe(false);
  });

  it('retombe sur validated (le plus strict) par défaut', () => {
    expect(parseLabMinStatus(undefined)).toBe('validated');
    expect(parseLabMinStatus('oops')).toBe('validated');
  });

  it('rétrograde une validation dont l’empreinte ne correspond plus aux artefacts', () => {
    expect(effectiveLabStatus('validated', 'a'.repeat(64), 'a'.repeat(64))).toEqual({
      status: 'validated',
      stale: false,
    });
    expect(effectiveLabStatus('validated', 'a'.repeat(64), 'b'.repeat(64))).toEqual({
      status: 'experimental',
      stale: true,
    });
    expect(effectiveLabStatus('validated', null, 'b'.repeat(64)).status).toBe('experimental');
    expect(effectiveLabStatus('experimental', null, 'b'.repeat(64))).toEqual({
      status: 'experimental',
      stale: false,
    });
  });
});

describe('ancres de titres', () => {
  it('produit des ancres stables sans accents ni apostrophes', () => {
    expect(headingSlug("Le lakehouse : un seul stockage, des garanties d'entrepôt")).toBe(
      'le-lakehouse-un-seul-stockage-des-garanties-dentrepot',
    );
    expect(headingSlug('  Revenir en arrière : RESTORE ')).toBe('revenir-en-arriere-restore');
  });
});
