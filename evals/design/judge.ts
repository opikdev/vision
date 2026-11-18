import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { run } from './process.ts';

export const criteria = ['hierarchy', 'typography', 'color', 'spacing', 'polish', 'brief'] as const;
export type Criterion = (typeof criteria)[number];

const criterionSchema = z.object({ score: z.number().int().min(1).max(10), reason: z.string() });
const verdictSchema = z.object(
  Object.fromEntries(criteria.map((name) => [name, criterionSchema])) as Record<
    Criterion,
    typeof criterionSchema
  >,
);
export type Verdict = z.infer<typeof verdictSchema>;

export const judgementSchema = z.object({
  artboard: z.string(),
  verdict: verdictSchema,
  costUsd: z.number(),
});
export type Judgement = z.infer<typeof judgementSchema>;

const resultSchema = z.object({
  type: z.literal('result'),
  is_error: z.boolean(),
  total_cost_usd: z.number(),
  structured_output: z.unknown(),
});

const judgeTimeoutMs = 3 * 60 * 1000;

export function verdictMean(verdict: Verdict): number {
  return criteria.reduce((sum, name) => sum + verdict[name].score, 0) / criteria.length;
}

export async function judgeScreenshot(options: {
  image: string;
  artboard: string;
  brief: string;
  model: string;
}): Promise<Judgement> {
  const system = await readFile(join(import.meta.dirname, 'judge.md'), 'utf8');
  const png = await readFile(options.image);
  const message = {
    type: 'user',
    message: {
      role: 'user',
      content: [
        { type: 'text', text: `Brief:\n\n${options.brief.trim()}` },
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: png.toString('base64') },
        },
        { type: 'text', text: `Score the artboard "${options.artboard}".` },
      ],
    },
  };
  const { code, stdout, stderr } = await run(
    'claude',
    [
      '-p',
      '--model',
      options.model,
      '--system-prompt',
      system,
      '--tools',
      '',
      '--strict-mcp-config',
      '--setting-sources',
      '',
      '--disable-slash-commands',
      '--no-session-persistence',
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--verbose',
      '--json-schema',
      JSON.stringify(z.toJSONSchema(verdictSchema, { target: 'draft-07' })),
      '--max-turns',
      '3',
    ],
    { cwd: import.meta.dirname, timeoutMs: judgeTimeoutMs, stdin: `${JSON.stringify(message)}\n` },
  );
  if (code !== 0) throw new Error(`claude exited with ${code}: ${stderr.trim().slice(0, 300)}`);
  const result = stdout
    .split('\n')
    .map((line) => {
      try {
        return resultSchema.safeParse(JSON.parse(line)).data;
      } catch {
        return undefined;
      }
    })
    .findLast((line) => line !== undefined);
  if (result === undefined || result.is_error) throw new Error('The judge returned no result');
  return {
    artboard: options.artboard,
    verdict: verdictSchema.parse(result.structured_output),
    costUsd: result.total_cost_usd,
  };
}
