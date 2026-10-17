import { readFileSync } from 'node:fs';

export type Permission = 'allow' | 'deny' | 'ask';

export interface Decision {
  readonly permission: Permission;
  readonly user_message?: string;
  readonly agent_message?: string;
}

export function readInput(): Record<string, unknown> {
  const raw = readFileSync(0, 'utf8');
  if (raw.trim() === '') return {};
  const parsed: unknown = JSON.parse(raw);
  return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
}

export function stringField(input: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

export function respond(decision: Decision): never {
  process.stdout.write(JSON.stringify(decision));
  process.exit(0);
}
