import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { TailwindStylesheets } from '../tailwind';

export async function loadTailwindStylesheets(): Promise<TailwindStylesheets> {
  const require = createRequire(import.meta.url);
  const load = (name: string): Promise<string> =>
    readFile(require.resolve(`tailwindcss/${name}.css`), 'utf8');
  const [theme, preflight, utilities] = await Promise.all([
    load('theme'),
    load('preflight'),
    load('utilities'),
  ]);
  return { theme, preflight, utilities };
}
