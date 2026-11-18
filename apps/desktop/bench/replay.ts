import { askSelection, socketPath } from '@vision/activity/node';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { recordingSchema, replay, save } from './recording';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { file: { type: 'string' }, speed: { type: 'string', default: '1' } },
});
const [path] = positionals;
const speed = Number(values.speed);
if (path === undefined || !(speed > 0)) {
  console.error('Usage: pnpm replay <recording.json> [--file <design.vis>] [--speed <n>]');
  process.exit(1);
}

const recording = recordingSchema.parse(JSON.parse(await readFile(path, 'utf8')));
const file = resolve(
  values.file ?? join(await mkdtemp(join(tmpdir(), 'vision-replay-')), 'replay.vis'),
);
const socket = socketPath();
await save(file, recording.start);
process.stdout.write(`Open ${file} in Vision; the replay starts once it's open.\n`);
while ((await askSelection(socket, file)).status !== 'open') await sleep(500);
await replay(recording, {
  file,
  socket,
  speed,
  onStep: ({ activity }, index) => {
    const summary = activity.kind === 'done' ? 'done' : activity.summary;
    process.stdout.write(`${index + 1}/${recording.steps.length} ${summary}\n`);
  },
});
process.stdout.write('Done.\n');
