import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from './vision';

const appDir = resolve(__dirname, '..');
const electron = join(appDir, 'node_modules', '.bin', 'electron');

test('screenshots an artboard taller than the screen', async ({ exampleCopy, dir, launch }) => {
  const source = await readFile(exampleCopy, 'utf8');
  await writeFile(exampleCopy, source.replace('"height": 900', '"height": 2450'));
  const out = join(dir, 'cart.png');

  await promisify(execFile)(electron, [
    appDir,
    `--vision-screenshot=${exampleCopy}`,
    '--artboard=cart',
    `--out=${out}`,
  ]);

  const { app } = await launch();
  const image = await app.evaluate(({ nativeImage }, path) => {
    const png = nativeImage.createFromPath(path);
    return {
      size: png.getSize(),
      bottomPixel: [...png.crop({ x: 720, y: 2400, width: 1, height: 1 }).toBitmap()],
    };
  }, out);
  expect(image).toEqual({
    size: { width: 1440, height: 2450 },
    bottomPixel: [0xe8, 0xef, 0xf2, 255],
  });
});
