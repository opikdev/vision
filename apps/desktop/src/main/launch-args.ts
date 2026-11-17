import { resolve } from 'node:path';

export function launchPaths(argv: readonly string[], cwd: string, defaultApp: boolean): string[] {
  return argv
    .slice(defaultApp ? 2 : 1)
    .filter((arg) => !arg.startsWith('-') && arg.toLowerCase().endsWith('.vis'))
    .map((arg) => resolve(cwd, arg));
}
