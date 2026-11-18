import { readFile, writeFile } from 'node:fs/promises';
import { recordingFromTranscript } from './recording';

const [transcript, out] = process.argv.slice(2);
if (transcript === undefined || out === undefined) {
  console.error('Usage: pnpm replay:record <transcript.jsonl> <recording.json>');
  process.exit(1);
}
const recording = recordingFromTranscript(await readFile(transcript, 'utf8'));
await writeFile(out, `${JSON.stringify(recording, null, 2)}\n`);
