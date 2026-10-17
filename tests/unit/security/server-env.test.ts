import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnvForTests, serverEnv } from '@/server/env';

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvForTests();
});

describe('configuration serveur', () => {
  it('refuse un espace réservé non remplacé en staging', () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('APP_ORIGIN', 'https://REPLACE_WITH_STAGING_BACKEND_URL');
    expect(() => serverEnv()).toThrow(/APP_ORIGIN contient encore un espace réservé/);
  });

  it('exige APP_ORIGIN en production', () => {
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('APP_ORIGIN', undefined);
    expect(() => serverEnv()).toThrow(/APP_ORIGIN est obligatoire/);
  });

  it('accepte une configuration de staging complète', () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('APP_ORIGIN', 'https://staging.example.test');
    vi.stubEnv('FIRESTORE_EMULATOR_HOST', undefined);
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', undefined);
    expect(serverEnv().APP_ORIGIN).toBe('https://staging.example.test');
  });

  it('autorise les espaces réservés en local', () => {
    vi.stubEnv('APP_ENV', 'local');
    vi.stubEnv('APP_ORIGIN', 'https://REPLACE_WITH_STAGING_BACKEND_URL');
    expect(serverEnv().APP_ENV).toBe('local');
  });
});
