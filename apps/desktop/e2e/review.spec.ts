import { reviewReportSchema } from '@vision/format';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from './vision';

const appDir = resolve(__dirname, '..');
const electron = join(appDir, 'node_modules', '.bin', 'electron');

test('reviews the example design as it is drawn', async ({ exampleCopy, dir }) => {
  const out = join(dir, 'review.json');

  await promisify(execFile)(electron, [appDir, `--vision-review=${exampleCopy}`, `--out=${out}`]);

  const report = reviewReportSchema.parse(JSON.parse(await readFile(out, 'utf8')));
  expect({
    score: report.score,
    nodes: report.nodes,
    counts: report.counts,
    artboards: report.artboards.map(({ id, score, counts }) => ({ id, score, counts })),
    findings: report.findings.map(({ severity, rule, nodeId }) => `${severity} ${rule} ${nodeId}`),
  }).toEqual({
    score: 97,
    nodes: 284,
    counts: { error: 0, warning: 8, info: 0 },
    artboards: [
      { id: 'cart', score: 99, counts: { error: 0, warning: 1, info: 0 } },
      { id: 'cart-mobile', score: 92, counts: { error: 0, warning: 6, info: 0 } },
      { id: 'payment', score: 99, counts: { error: 0, warning: 1, info: 0 } },
    ],
    findings: [
      'warning spacing div-25',
      'warning touch-target button-13',
      'warning touch-target button-14',
      'warning touch-target button-15',
      'warning touch-target button-16',
      'warning touch-target button-17',
      'warning touch-target button-18',
      'warning spacing div-56',
    ],
  });
});

test('reviews one artboard and fails clearly on an unknown one', async ({ exampleCopy, dir }) => {
  const out = join(dir, 'review.json');
  const run = (artboard: string) =>
    promisify(execFile)(electron, [
      appDir,
      `--vision-review=${exampleCopy}`,
      `--out=${out}`,
      `--artboard=${artboard}`,
    ]);

  await run('cart');
  const report = reviewReportSchema.parse(JSON.parse(await readFile(out, 'utf8')));
  expect(report.artboards.map(({ id }) => id)).toEqual(['cart']);

  await expect(run('missing')).rejects.toMatchObject({
    code: 1,
    stderr: `No artboard with id "missing" in ${exampleCopy}\n`,
  });
});
