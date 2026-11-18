import { copyFile, cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import {
  criteria,
  judgementSchema,
  judgeScreenshot,
  verdictMean,
  type Judgement,
} from './judge.ts';
import { run } from './process.ts';
import { formatSpread, spread, transcriptUsage, writeHtmlStats } from './stats.ts';

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
    runs: { type: 'string', default: '2' },
    model: { type: 'string', default: 'sonnet' },
    'max-turns': { type: 'string', default: '150' },
    'max-budget-usd': { type: 'string', default: '10' },
    concurrency: { type: 'string', default: '2' },
    step: { type: 'string', default: 'all' },
    repeats: { type: 'string', default: '3' },
    mcp: { type: 'string', default: join(repo, 'packages/mcp/dist/vision-mcp.mjs') },
    'mcp-app': { type: 'string', default: desktop },
  },
});

const usageSchema = z.object({
  inputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  outputTokens: z.number(),
});

const runSchema = z.object({
  brief: z.string(),
  ok: z.boolean(),
  attempts: z.number(),
  model: z.string(),
  turns: z.number(),
  costUsd: z.number(),
  durationMs: z.number(),
  usage: usageSchema.optional(),
  writeHtml: z
    .object({
      calls: z.number(),
      elements: z.number(),
      htmlChars: z.number(),
      svgChars: z.number(),
    })
    .optional(),
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

interface Task {
  brief: string;
  index: number;
  dir: string;
}

interface Scored {
  brief: string;
  run: Run | undefined;
  review: Review | undefined;
  judgements: Judgement[];
  error: string | undefined;
}

const steps = ['all', 'generate', 'score', 'judge', 'calibrate'] as const;

async function main(): Promise<void> {
  const { out, round } = options;
  if (out === undefined || round === undefined) {
    throw new Error(
      `Usage: pnpm eval:design --out=<results folder> --round=<name> [--briefs=a,b] [--runs=2] [--step=${steps.join('|')}]`,
    );
  }
  const step = z.enum(steps).parse(options.step);
  const runs = z.coerce.number().int().min(1).parse(options.runs);
  const roundDir = resolve(out, round);
  const briefs = await selectedBriefs(options.briefs);
  const tasks = briefs.flatMap((brief) =>
    Array.from({ length: runs }, (_, index) => ({
      brief,
      index: index + 1,
      dir: join(roundDir, brief, `run-${index + 1}`),
    })),
  );
  if (step === 'calibrate') {
    const report = await calibrate(tasks.filter(({ index }) => index === 1));
    await writeFile(join(roundDir, 'calibration.md'), report);
    process.stdout.write(`\n${report}`);
    return;
  }
  const results = await pool(tasks, Number(options.concurrency), async (task) => {
    await mkdir(task.dir, { recursive: true });
    const run = step === 'all' || step === 'generate' ? await generate(task) : await readRun(task);
    if (step === 'generate')
      return { brief: task.brief, run, review: undefined, judgements: [], error: undefined };
    return score(task, run, step !== 'judge');
  });
  const summary = summarize(round, briefs, results);
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

async function generate(task: Task): Promise<Run> {
  let run = await attempt(task, 1);
  if (!run.ok) {
    log(task, `failed (${run.error ?? 'unknown'}), retrying once`);
    run = await attempt(task, 2);
  }
  await writeFile(join(task.dir, 'run.json'), `${JSON.stringify(run, null, 2)}\n`);
  return run;
}

async function attempt(task: Task, attempts: number): Promise<Run> {
  const { brief, dir } = task;
  const work = await mkdtemp(join(tmpdir(), 'vision-eval-'));
  try {
    const file = join(work, 'design.vis');
    const mcpConfig = join(work, 'mcp.json');
    await writeFile(mcpConfig, JSON.stringify(mcpServers(work)));
    const text = await readFile(join(briefsDir, `${brief}.md`), 'utf8');
    const prompt = `${text.trim()}\n\nDesign it in ${file} using the vision MCP tools.`;
    const transcript = join(dir, `transcript-${attempts}.jsonl`);
    log(task, `generating (attempt ${attempts})`);
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
    const usage = transcriptUsage(lines);
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
      ...(usage === undefined ? {} : { usage }),
      writeHtml: writeHtmlStats(lines),
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

async function readRun({ dir }: Task): Promise<Run | undefined> {
  try {
    return runSchema.parse(JSON.parse(await readFile(join(dir, 'run.json'), 'utf8')));
  } catch {
    return undefined;
  }
}

async function score(task: Task, run: Run | undefined, review: boolean): Promise<Scored> {
  const { brief, dir } = task;
  const file = join(dir, 'design.vis');
  const reviewFile = join(dir, 'review.json');
  const shots = join(dir, 'screenshots');
  if (review) {
    log(task, 'reviewing');
    const failed = await runApp([`--vision-review=${file}`, `--out=${reviewFile}`]);
    if (failed !== undefined)
      return { brief, run, review: undefined, judgements: [], error: failed };
  }
  const reviewed = reviewSchema.parse(JSON.parse(await readFile(reviewFile, 'utf8')));
  if (review) {
    await rm(shots, { recursive: true, force: true });
    await mkdir(shots);
    for (const artboard of reviewed.artboards) {
      const scale = Math.min(1, maxScreenshotSide / Math.max(artboard.width, artboard.height));
      const failed = await runApp([
        `--vision-screenshot=${file}`,
        `--artboard=${artboard.id}`,
        `--out=${join(shots, `${artboard.id}.png`)}`,
        `--scale=${scale}`,
      ]);
      if (failed !== undefined) log(task, `screenshot of ${artboard.id} failed: ${failed}`);
    }
  }
  const judgements = await judge(task, reviewed);
  await writeFile(join(dir, 'judge.json'), `${JSON.stringify(judgements, null, 2)}\n`);
  const means = judgements.map(({ verdict }) => verdictMean(verdict));
  log(task, `score ${reviewed.score}, judge ${spread(means)?.mean.toFixed(1) ?? '–'}`);
  return { brief, run, review: reviewed, judgements, error: undefined };
}

async function judge(task: Task, review: Review): Promise<Judgement[]> {
  const brief = await readFile(join(briefsDir, `${task.brief}.md`), 'utf8');
  const judgements: Judgement[] = [];
  for (const { id } of review.artboards) {
    const image = join(task.dir, 'screenshots', `${id}.png`);
    try {
      judgements.push(await judgeScreenshot({ image, artboard: id, brief, model: options.model }));
    } catch (error) {
      log(task, `judging ${id} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return judgementSchema.array().parse(judgements);
}

async function calibrate(tasks: Task[]): Promise<string> {
  const repeats = z.coerce.number().int().min(2).parse(options.repeats);
  const rows: string[][] = [];
  let cost = 0;
  for (const task of tasks) {
    const shots = (await readdir(join(task.dir, 'screenshots'))).filter((name) =>
      name.endsWith('.png'),
    );
    const [first] = shots.sort();
    if (first === undefined) continue;
    const brief = await readFile(join(briefsDir, `${task.brief}.md`), 'utf8');
    const artboard = basename(first, '.png');
    const image = join(task.dir, 'screenshots', first);
    const judgements: Judgement[] = [];
    for (let repeat = 1; repeat <= repeats; repeat++) {
      log(task, `calibrating ${artboard} (${repeat}/${repeats})`);
      judgements.push(await judgeScreenshot({ image, artboard, brief, model: options.model }));
    }
    cost += judgements.reduce((sum, { costUsd }) => sum + costUsd, 0);
    const of = (pick: (judgement: Judgement) => number) => judgements.map(pick);
    rows.push([
      `${task.brief}/${artboard}`,
      ...criteria.map((name) => of(({ verdict }) => verdict[name].score).join(', ')),
      formatSpread(spread(of(({ verdict }) => verdictMean(verdict))), 2),
    ]);
  }
  return [
    `# Judge calibration`,
    '',
    `Each screenshot judged ${repeats} times by ${options.model}. Mean is the mean of the six criteria, ± its sample standard deviation across repeats. Cost $${cost.toFixed(2)}.`,
    '',
    table(['Screenshot', ...criteria, 'Mean'], rows),
    '',
  ].join('\n');
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

interface Metric {
  head: string;
  digits: number;
  unit?: string;
  value: (result: Scored) => number | undefined;
}

const metrics: Metric[] = [
  { head: 'Score', digits: 1, value: ({ review }) => review?.score },
  {
    head: 'Judge',
    digits: 2,
    value: ({ judgements }) =>
      judgements.length === 0
        ? undefined
        : judgements.reduce((sum, { verdict }) => sum + verdictMean(verdict), 0) /
          judgements.length,
  },
  { head: 'Errors', digits: 1, value: ({ review }) => count(review, 'error') },
  { head: 'Warnings', digits: 1, value: ({ review }) => count(review, 'warning') },
  { head: 'Nodes', digits: 0, value: ({ review }) => review?.nodes },
  {
    head: 'Minutes',
    digits: 2,
    value: ({ run }) => (run === undefined ? undefined : run.durationMs / 60000),
  },
  { head: 'Output k', digits: 1, value: ({ run }) => thousands(run?.usage?.outputTokens) },
  {
    head: 'Input k (uncached)',
    digits: 1,
    value: ({ run }) =>
      run?.usage === undefined
        ? undefined
        : (run.usage.inputTokens + run.usage.cacheCreationTokens) / 1000,
  },
  { head: 'Cache read k', digits: 0, value: ({ run }) => thousands(run?.usage?.cacheReadTokens) },
  { head: 'Cost', digits: 3, unit: '$', value: ({ run }) => run?.costUsd },
  { head: 'Turns', digits: 1, value: ({ run }) => run?.turns },
  { head: 'write_html', digits: 1, value: ({ run }) => run?.writeHtml?.calls },
  {
    head: 'Elements/call',
    digits: 1,
    value: ({ run }) =>
      run?.writeHtml === undefined || run.writeHtml.calls === 0
        ? undefined
        : run.writeHtml.elements / run.writeHtml.calls,
  },
  {
    head: 'SVG % of HTML',
    digits: 1,
    value: ({ run }) =>
      run?.writeHtml === undefined || run.writeHtml.htmlChars === 0
        ? undefined
        : (100 * run.writeHtml.svgChars) / run.writeHtml.htmlChars,
  },
];

function count(review: Review | undefined, severity: string): number | undefined {
  return review?.findings.filter((finding) => finding.severity === severity).length;
}

function thousands(value: number | undefined): number | undefined {
  return value === undefined ? undefined : value / 1000;
}

function summarize(round: string, briefs: string[], results: Scored[]): string {
  const row = (label: string, group: Scored[]) => [
    label,
    String(group.length),
    ...metrics.map(({ digits, unit, value }) =>
      formatSpread(spread(group.flatMap((result) => value(result) ?? [])), digits, unit),
    ),
  ];
  const rows = briefs.map((brief) =>
    row(
      brief,
      results.filter((result) => result.brief === brief),
    ),
  );
  const failures = results.flatMap(({ brief, error, run }) => {
    const reason = error ?? (run?.ok === false ? run.error : undefined);
    return reason === undefined ? [] : [`- ${brief}: ${reason}`];
  });
  const judgements = results.flatMap(({ judgements }) => judgements);
  const byCriterion = criteria.map((name) => [
    name,
    ...briefs.map((brief) =>
      formatSpread(
        spread(
          results
            .filter((result) => result.brief === brief)
            .flatMap(({ judgements }) => judgements.map(({ verdict }) => verdict[name].score)),
        ),
      ),
    ),
    formatSpread(spread(judgements.map(({ verdict }) => verdict[name].score))),
  ]);
  const rules = [
    ...new Set(results.flatMap(({ review }) => review?.findings.map(({ rule }) => rule) ?? [])),
  ].sort();
  const byRule = rules.map((rule) => [
    rule,
    ...briefs.map((brief) => {
      const findings = results
        .filter((result) => result.brief === brief)
        .flatMap(({ review }) => review?.findings.filter((finding) => finding.rule === rule) ?? []);
      const errors = findings.filter(({ severity }) => severity === 'error').length;
      const warnings = findings.filter(({ severity }) => severity === 'warning').length;
      return `${errors} / ${warnings}`;
    }),
  ]);
  const designCost = results.reduce((sum, { run }) => sum + (run?.costUsd ?? 0), 0);
  const judgeCost = judgements.reduce((sum, { costUsd }) => sum + costUsd, 0);
  const model = results.find(({ run }) => run !== undefined)?.run?.model ?? options.model;
  return [
    `# Design eval: ${round}`,
    '',
    `Model ${model}. Cost $${designCost.toFixed(2)} for designs and $${judgeCost.toFixed(2)} for the judge (${judgements.length} screenshots).`,
    '',
    'Each cell is the mean over runs ± the sample standard deviation between runs. Judge is the mean of the six rubric criteria, from 1 to 10, over the artboards of a run.',
    '',
    table(
      ['Brief', 'Runs', ...metrics.map(({ head }) => head)],
      [...rows, row('**All**', results)],
    ),
    '',
    ...(failures.length === 0 ? [] : ['## Failures', '', ...failures, '']),
    '## Judge by criterion',
    '',
    table(['Criterion', ...briefs, 'All'], byCriterion),
    '',
    '## Errors / warnings by rule, all runs',
    '',
    table(['Rule', ...briefs], byRule),
    '',
  ].join('\n');
}

function table(head: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n');
}

function log(task: Pick<Task, 'brief' | 'index'>, message: string): void {
  process.stdout.write(
    `${new Date().toISOString().slice(11, 19)} ${task.brief} #${task.index}: ${message}\n`,
  );
}

await main();
