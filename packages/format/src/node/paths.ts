import { basename, dirname, extname, join } from 'node:path';

export function assetsDirFor(designPath: string): string {
  const name = basename(designPath, extname(designPath) === '.vis' ? '.vis' : '');
  return join(dirname(designPath), `${name}.assets`);
}
