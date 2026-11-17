import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { copyFile, cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';

const repo = resolve(import.meta.dirname, '../..');
const briefsDir = join(import.meta.dirname, 'briefs');
const electron = join(repo, 'apps/desktop/node_modules/.bin/electron');
const desktop = join(repo, 'apps/desktop');
const maxScreenshotSide = 2000;
const claudeTimeoutMs = 45 * 60 * 1000;
const appTimeoutMs = 90 * 1000;

const { values: options } = parseArgs({
  options: {
    out: { type: 'string' },
    round: { type: 'string' },
    briefs: { type: 'string' },
    model: { type: 'string', default: 'sonnet' },
    'max-turns': { type: 'string', default: '150' },
    'max-budget-usd': { type: 'string', default: '10' },
    concurrency: { type: 'string', default: '2' },
    step: { type: 'string', default: 'all' },
    mcp: { type: 'string', default: join(repo, 'packages/mcp/dist/vision-mcp.mjs') },
    'mcp-app': { type: 'string', default: desktop },
  },
});

const runSchema = z.object({
  brief: z.string(),
  ok: z.boolean(),
  attempts: z.number(),
  model: z.string(),
  turns: z.number(),
  costUsd: z.number(),
  durationMs: z.number(),
  error: z.string().optional(),
});
type Run = z.infer<typeof runSchema>;

const claudeInitSchema = z.object({ type: z.literal('system'), model: z.string() });
const claudeResultSchema = z.object({
  type: z.literal('result'),
  is_error: z.boolean(),
  num_turns: z.number(),
  total_cost_usd: z.number(),
  duration_ms: z.number(),
  result: z.string().optional(),
});

const severitySchema = z.enum(['error', 'warning', 'info']);
const reviewSchema = z.object({
  score: z.number(),
  nodes: z.number(),
  artboards: z.array(
    z.object({ id: z.string(), width: z.number(), height: z.number(), score: z.number() }),
  ),
  findings: z.array(z.object({ rule: z.string(), severity: severitySchema })),
});
type Review = z.infer<typeof reviewSchema>;

interface Scored {
  brief: string;
  run: Run | undefined;
  review: Review | undefined;
  error: string | undefined;
}

async function main(): Promise<void> {
  const { out, round } = options;
  if (out === undefined || round === undefined) {
    throw new Error(
      'Usage: pnpm eval:design --out=<results folder> --round=<name> [--briefs=a,b] [--step=all|generate|score]',
    );
  }
  const step = z.enum(['all', 'generate', 'score']).parse(options.step);
  const roundDir = resolve(out, round);
  const briefs = await selectedBriefs(options.briefs);
  const results = await pool(briefs, Number(options.concurrency), async (brief) => {
    const dir = join(roundDir, brief);
    await mkdir(dir, { recursive: true });
    const run = step === 'score' ? await readRun(dir) : await generate(brief, dir);
    return step === 'generate'
      ? { brief, run, review: undefined, error: undefined }
      : score(brief, dir, run);
  });
  const summary = summarize(round, results);
  await writeFile(join(roundDir, 'summary.md'), summary);
  process.stdout.write(`\n${summary}`);
}

async function selectedBriefs(list: string | undefined): Promise<string[]> {
  const all = (await readdir(briefsDir))
    .filter((name) => name.endsWith('.md'))
    .map((name) => basename(name, '.md'))
    .sort();
  if (list === undefined) return all;
  const wanted = list.split(',');
  const unknown = wanted.filter((name) => !all.includes(name));
  if (unknown.length > 0) throw new Error(`Unknown briefs: ${unknown.join(', ')}`);
  return wanted;
}

async function generate(brief: string, dir: string): Promise<Run> {
  let run = await attempt(brief, dir, 1);
  if (!run.ok) {
    log(brief, `failed (${run.error ?? 'unknown'}), retrying once`);
    run = await attempt(brief, dir, 2);
  }
  await writeFile(join(dir, 'run.json'), `${JSON.stringify(run, null, 2)}\n`);
  return run;
}

async function attempt(brief: string, dir: string, attempts: number): Promise<Run> {
  const work = await mkdtemp(join(tmpdir(), 'vision-eval-'));
  try {
    const file = join(work, 'design.vis');
    const mcpConfig = join(work, 'mcp.json');
    await writeFile(mcpConfig, JSON.stringify(mcpServers(work)));
    const text = await readFile(join(briefsDir, `${brief}.md`), 'utf8');
    const prompt = `${text.trim()}\n\nDesign it in ${file} using the vision MCP tools.`;
    const transcript = join(dir, `transcript-${attempts}.jsonl`);
    log(brief, `generating (attempt ${attempts})`);
    const { code, stderr } = await run(
      'claude',
      [
        '-p',
        prompt,
        '--model',
        options.model,
        '--setting-sources',
        'project',
        '--disable-slash-commands',
        '--strict-mcp-config',
        '--mcp-config',
        mcpConfig,
        '--tools',
        '',
        '--allowedTools',
        'mcp__vision__*',
        '--max-turns',
        options['max-turns'],
        '--max-budget-usd',
        options['max-budget-usd'],
        '--no-session-persistence',
        '--output-format',
        'stream-json',
        '--verbose',
      ],
      { cwd: work, timeoutMs: claudeTimeoutMs, stdoutFile: transcript },
    );
    const lines = (await readFile(transcript, 'utf8')).split('\n').filter((line) => line !== '');
    const init = lines.map(parseLine(claudeInitSchema)).find((value) => value !== undefined);
    const result = lines
      .map(parseLine(claudeResultSchema))
      .findLast((value) => value !== undefined);
    const copied = await copyDesign(work, dir);
    const error =
      code !== 0
        ? `claude exited with ${code}: ${stderr.trim().slice(0, 300)}`
        : result === undefined
          ? 'no result message'
          : result.is_error
            ? `claude reported an error: ${result.result ?? ''}`.slice(0, 300)
            : copied
              ? undefined
              : 'no design.vis was written';
    return {
      brief,
      ok: error === undefined,
      attempts,
      model: init?.model ?? options.model,
      turns: result?.num_turns ?? 0,
      costUsd: result?.total_cost_usd ?? 0,
      durationMs: result?.duration_ms ?? 0,
      ...(error === undefined ? {} : { error }),
    };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

function mcpServers(work: string): unknown {
  return {
    mcpServers: {
      vision: {
        type: 'stdio',
        command: 'node',
        args: [options.mcp],
        env: {
          VISION_APP: electron,
          VISION_APP_ENTRY: options['mcp-app'],
          VISION_ACTIVITY_SOCKET: join(work, 'activity.sock'),
        },
      },
    },
  };
}

function parseLine<T>(schema: z.ZodType<T>): (line: string) => T | undefined {
  return (line) => {
    try {
      const parsed = schema.safeParse(JSON.parse(line));
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  };
}

async function copyDesign(work: string, dir: string): Promise<boolean> {
  try {
    await copyFile(join(work, 'design.vis'), join(dir, 'design.vis'));
  } catch {
    return false;
  }
  const assets = join(work, 'design.assets');
  const entries = await readdir(assets, { recursive: true }).catch(() => []);
  if (entries.length > 0) {
    await rm(join(dir, 'design.assets'), { recursive: true, force: true });
    await cp(assets, join(dir, 'design.assets'), { recursive: true });
  }
  return true;
}

async function readRun(dir: string): Promise<Run | undefined> {
  try {
    return runSchema.parse(JSON.parse(await readFile(join(dir, 'run.json'), 'utf8')));
  } catch {
    return undefined;
  }
}

async function score(brief: string, dir: string, run: Run | undefined): Promise<Scored> {
  const file = join(dir, 'design.vis');
  const reviewFile = join(dir, 'review.json');
  log(brief, 'reviewing');
  const reviewed = await runApp([`--vision-review=${file}`, `--out=${reviewFile}`]);
  if (reviewed !== undefined) return { brief, run, review: undefined, error: reviewed };
  const review = reviewSchema.parse(JSON.parse(await readFile(reviewFile, 'utf8')));
  const shots = join(dir, 'screenshots');
  await rm(shots, { recursive: true, force: true });
  await mkdir(shots);
  for (const artboard of review.artboards) {
    const scale = Math.min(1, maxScreenshotSide / Math.max(artboard.width, artboard.height));
    const failed = await runApp([
      `--vision-screenshot=${file}`,
      `--artboard=${artboard.id}`,
      `--out=${join(shots, `${artboard.id}.png`)}`,
      `--scale=${scale}`,
    ]);
    if (failed !== undefined) log(brief, `screenshot of ${artboard.id} failed: ${failed}`);
  }
  log(brief, `score ${review.score}`);
  return { brief, run, review, error: undefined };
}

async function runApp(args: string[]): Promise<string | undefined> {
  const profile = await mkdtemp(join(tmpdir(), 'vision-eval-profile-'));
  try {
    const { code, stderr } = await run(electron, [desktop, ...args, `--user-data-dir=${profile}`], {
      cwd: repo,
      timeoutMs: appTimeoutMs,
    });
    return code === 0 ? undefined : stderr.trim() || `exit code ${code}`;
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}

interface RunOptions {
  cwd: string;
  timeoutMs?: number;
  stdoutFile?: string;
}

function run(
  command: string,
  args: string[],
  { cwd, timeoutMs, stdoutFile }: RunOptions,
): Promise<{ code: number | null; stderr: string }> {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', stdoutFile === undefined ? 'ignore' : 'pipe', 'pipe'],
      ...(timeoutMs === undefined ? {} : { timeout: timeoutMs, killSignal: 'SIGKILL' }),
    });
    if (stdoutFile !== undefined) child.stdout?.pipe(createWriteStream(stdoutFile));
    let stderr = '';
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolveRun({ code, stderr });
    });
  });
}

async function pool<T, R>(items: T[], size: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, size) }, worker));
  return results;
}

function summarize(round: string, results: Scored[]): string {
  const rules = [
    ...new Set(results.flatMap(({ review }) => review?.findings.map(({ rule }) => rule) ?? [])),
  ].sort();
  const rows = results.map(({ brief, run, review, error }) => {
    const count = (severity: string) =>
      review?.findings.filter((finding) => finding.severity === severity).length ?? '–';
    return [
      brief,
      review !== undefined
        ? String(review.score)
        : error === undefined
          ? 'not scored'
          : `failed: ${error}`,
      String(count('error')),
      String(count('warning')),
      String(review?.nodes ?? '–'),
      String(review?.artboards.length ?? '–'),
      String(run?.turns ?? '–'),
      run === undefined ? '–' : `$${run.costUsd.toFixed(2)}`,
      run === undefined ? '–' : (run.durationMs / 60000).toFixed(1),
    ];
  });
  const byRule = rules.map((rule) => [
    rule,
    ...results.map(({ review }) => {
      const findings = review?.findings.filter((finding) => finding.rule === rule) ?? [];
      const errors = findings.filter(({ severity }) => severity === 'error').length;
      const warnings = findings.filter(({ severity }) => severity === 'warning').length;
      return `${errors} / ${warnings}`;
    }),
  ]);
  const scores = results.flatMap(({ review }) => (review === undefined ? [] : [review.score]));
  const cost = results.reduce((sum, { run }) => sum + (run?.costUsd ?? 0), 0);
  const mean = scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length;
  const model = results.find(({ run }) => run !== undefined)?.run?.model ?? options.model;
  return [
    `# Design eval: ${round}`,
    '',
    `Model ${model}. Mean score ${mean.toFixed(1)}. Total cost $${cost.toFixed(2)}.`,
    '',
    table(
      ['Brief', 'Score', 'Errors', 'Warnings', 'Nodes', 'Artboards', 'Turns', 'Cost', 'Minutes'],
      rows,
    ),
    '',
    '## Errors / warnings by rule',
    '',
    table(['Rule', ...results.map(({ brief }) => brief)], byRule),
    '',
  ].join('\n');
}

function table(head: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n');
}

function log(brief: string, message: string): void {
  process.stdout.write(`${new Date().toISOString().slice(11, 19)} ${brief}: ${message}\n`);
}

await main();
