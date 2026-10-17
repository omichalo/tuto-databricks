import 'server-only';
import { z } from 'zod';
import { CONTENT_STATUSES } from '@/domain/content/status';
import { LAB_STATUSES } from '@/domain/labs/manifest-schema';

const boolString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const envSchema = z
  .object({
    APP_ENV: z.enum(['local', 'test', 'staging', 'production']).default('local'),
    APP_ORIGIN: z.url().optional(),
    APP_CHECK_ENFORCED: boolString,
    CONTENT_MIN_STATUS: z.enum(CONTENT_STATUSES).default('published'),
    LAB_MIN_STATUS: z.enum(LAB_STATUSES).default('validated'),
    // Le correcteur SQL serveur n'existe pas : toute autre valeur que 'false' empêche le démarrage.
    SQL_SERVER_GRADING_ENABLED: z.literal('false').default('false'),
    FIRESTORE_EMULATOR_HOST: z.string().optional(),
    FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
    GCLOUD_PROJECT: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === 'staging' || env.APP_ENV === 'production') {
      for (const [name, value] of Object.entries(env)) {
        if (typeof value === 'string' && value.includes('REPLACE_WITH_')) {
          ctx.addIssue({ code: 'custom', message: `${name} contient encore un espace réservé` });
        }
      }
    }
    if (
      (env.APP_ENV === 'staging' || env.APP_ENV === 'production') &&
      env.APP_ORIGIN === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'APP_ORIGIN est obligatoire en staging et en production',
      });
    }
    if (
      env.APP_ENV === 'production' &&
      (env.FIRESTORE_EMULATOR_HOST !== undefined || env.FIREBASE_AUTH_EMULATOR_HOST !== undefined)
    ) {
      ctx.addIssue({ code: 'custom', message: 'Les émulateurs sont interdits en production' });
    }
  });

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  cached ??= envSchema.parse(process.env);
  return cached;
}

export function resetServerEnvForTests(): void {
  cached = null;
}

export function usesEmulators(env: ServerEnv = serverEnv()): boolean {
  return env.FIRESTORE_EMULATOR_HOST !== undefined || env.FIREBASE_AUTH_EMULATOR_HOST !== undefined;
}
