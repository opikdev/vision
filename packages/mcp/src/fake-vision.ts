import { chmod, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const script = `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const option = (name) => args.find((arg) => arg.startsWith(name + '='))?.slice(name.length + 1);
writeFileSync(process.env.FAKE_VISION_LOG, JSON.stringify({ args, electronRunAsNode: process.env.ELECTRON_RUN_AS_NODE ?? null }));
if (option('--artboard') === 'broken') {
  process.stderr.write('No artboard has id "broken".\\n');
  process.exit(1);
}
if (option('--vision-review') !== undefined) {
  if (option('--artboard') !== 'silent') writeFileSync(option('--out'), process.env.FAKE_VISION_REVIEW ?? '');
} else if (option('--artboard') !== 'silent') {
  writeFileSync(option('--out'), Buffer.from('${onePixelPng.toString('base64')}', 'base64'));
}
`;

export async function writeFakeVision(dir: string): Promise<string> {
  const path = join(dir, 'fake-vision.mjs');
  await writeFile(path, script);
  await chmod(path, 0o755);
  return path;
}
