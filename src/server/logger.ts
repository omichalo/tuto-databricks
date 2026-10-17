import 'server-only';

type Severity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export type LogFields = Readonly<Record<string, string | number | boolean | null | undefined>>;

/**
 * Journal structuré sur stdout : Cloud Logging interprète `severity` et `message` des lignes JSON,
 * et Error Reporting regroupe les entrées ERROR qui contiennent une pile (`stack_trace`).
 */
function write(severity: Severity, message: string, fields: LogFields = {}): void {
  const entry = { severity, message, time: new Date().toISOString(), ...fields };
  const line = JSON.stringify(entry);
  if (severity === 'ERROR') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => {
    write('DEBUG', message, fields);
  },
  info: (message: string, fields?: LogFields) => {
    write('INFO', message, fields);
  },
  warn: (message: string, fields?: LogFields) => {
    write('WARNING', message, fields);
  },
  error: (message: string, error: unknown, fields?: LogFields) => {
    write('ERROR', message, {
      ...fields,
      stack_trace: error instanceof Error ? (error.stack ?? error.message) : String(error),
    });
  },
};
