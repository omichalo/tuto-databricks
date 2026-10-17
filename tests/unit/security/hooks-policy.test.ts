import { describe, expect, it } from 'vitest';
import { readDecision, shellVerdict } from '../../../.cursor/hooks/policy';
import {
  freeEditionAutomationViolations,
  graderFlagViolations,
} from '../../../scripts/guards/invariants';

const permission = (command: string): string => {
  const v = shellVerdict(command);
  return v === 'run-invariants' ? v : v.permission;
};

describe('hook beforeShellExecution', () => {
  it.each([
    'firebase deploy --project production',
    'firebase apphosting:rollouts:create my-backend --project prod',
    'npx firebase deploy --only firestore:rules --project=production',
  ])('bloque la production : %s', (cmd) => {
    expect(permission(cmd)).toBe('deny');
  });

  it.each([
    'firebase deploy --project staging',
    'firebase apphosting:secrets:set APP_SECRET',
    'gcloud projects create foo',
    'gcloud run services delete x',
  ])('demande une confirmation pour toute mutation cloud : %s', (cmd) => {
    expect(permission(cmd)).toBe('ask');
  });

  it.each([
    'databricks jobs run-now 12',
    'cd x && databricks bundle deploy',
    'databricks workspace import a b',
    'npx databricks sql query',
    'curl -X POST https://dbc-123.cloud.databricks.com/api/2.1/jobs/run-now',
  ])('bloque toute commande Databricks : %s', (cmd) => {
    expect(permission(cmd)).toBe('deny');
  });

  it.each([
    'cat .env',
    'cat .env.local',
    'grep KEY .env.production',
    'head -n 3 config/.env.staging',
  ])('bloque la lecture des .env : %s', (cmd) => {
    expect(permission(cmd)).toBe('deny');
  });

  it.each([
    'grep -n SQL .env.example',
    'cp .env.example .env.local',
    'npm run build',
    'firebase emulators:exec --project demo-tuto-databricks --only auth,firestore "npm test"',
    'npx vitest run --project emulators',
    'git status',
    'firebase --version',
    'gcloud config list',
    'databricks --version',
    'rg -n "databricks bundle" docs',
    'echo "voir databricks jobs"',
  ])('laisse passer les commandes locales : %s', (cmd) => {
    expect(permission(cmd)).toBe('allow');
  });

  it.each([
    'firebase --project staging deploy --only firestore:rules',
    'npx firebase-tools@15.34.0 --non-interactive deploy',
  ])('demande confirmation quel que soit l’ordre des arguments : %s', (cmd) => {
    expect(permission(cmd)).toBe('ask');
  });

  it.each([
    `python3 -c "print(open('.env.local').read())"`,
    'git show HEAD:.env.local',
    "node -e \"require('fs').readFileSync('.env')\"",
    'cp .env.local /tmp/x',
  ])('demande confirmation pour toute mention d’un .env : %s', (cmd) => {
    expect(permission(cmd)).toBe('ask');
  });

  it.each(['cp .env.example .env.example.bak', 'git add .env.example', 'npm run dev'])(
    'laisse passer sans .env sensible : %s',
    (cmd) => {
      expect(permission(cmd)).toBe('allow');
    },
  );

  it('vérifie les invariants avant un commit', () => {
    expect(permission('git commit -m "x"')).toBe('run-invariants');
    expect(
      permission('git commit -q -m "Databricks bloqué ; aucune automatisation databricks jobs"'),
    ).toBe('run-invariants');
  });
});

describe('hook beforeReadFile', () => {
  it.each(['/repo/.env', '/repo/.env.local', 'service-account-staging.json', 'key.pem'])(
    'refuse %s',
    (path) => {
      expect(readDecision(path).permission).toBe('deny');
    },
  );
  it.each(['/repo/.env.example', '/repo/src/server/env.ts', 'apphosting.yaml'])(
    'autorise %s',
    (path) => {
      expect(readDecision(path).permission).toBe('allow');
    },
  );
});

describe('invariants du dépôt', () => {
  it('le correcteur SQL serveur est désactivé partout', () => {
    expect(graderFlagViolations()).toEqual([]);
  });
  it("aucun workflow n'automatise Databricks", () => {
    expect(freeEditionAutomationViolations()).toEqual([]);
  });
});
