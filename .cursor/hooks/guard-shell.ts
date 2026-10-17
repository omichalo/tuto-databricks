/**
 * beforeShellExecution : garde-fous sur les commandes lancées par l'agent (règles dans policy.ts).
 * `git commit` est refusé si les invariants du dépôt ne sont pas respectés.
 */
import { execFileSync } from 'node:child_process';
import { readInput, respond, stringField } from './lib';
import { shellVerdict } from './policy';

const verdict = shellVerdict(stringField(readInput(), 'command'));

if (verdict !== 'run-invariants') respond(verdict);

try {
  execFileSync('npx', ['--no-install', 'tsx', 'scripts/guards/invariants.ts'], { stdio: 'pipe' });
} catch (error) {
  const stderr =
    typeof error === 'object' && error !== null && 'stderr' in error ? String(error.stderr) : '';
  respond({
    permission: 'deny',
    user_message: 'Commit bloqué : invariants du dépôt non respectés (npm run guards).',
    agent_message: `npm run guards a échoué :\n${stderr}`,
  });
}
respond({ permission: 'allow' });
