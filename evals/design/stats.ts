import { z } from 'zod';

export interface Usage {
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
}

export interface WriteHtmlStats {
  calls: number;
  elements: number;
  htmlChars: number;
  svgChars: number;
}

export interface Spread {
  mean: number;
  sd: number;
}

const usageSchema = z.object({
  input_tokens: z.number(),
  cache_creation_input_tokens: z.number().default(0),
  cache_read_input_tokens: z.number().default(0),
  output_tokens: z.number(),
});

const resultLineSchema = z.object({ type: z.literal('result'), usage: usageSchema });

const toolUseSchema = z.object({
  type: z.literal('tool_use'),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
});

const assistantLineSchema = z.object({
  type: z.literal('assistant'),
  message: z.object({ content: z.array(z.unknown()) }),
});

const htmlInputSchema = z.object({ html: z.string() });

const svgPattern = /<svg\b[\s\S]*?<\/svg>/gi;

export function countElements(html: string): number {
  return html.replace(svgPattern, '<svg>').match(/<[a-z][a-z0-9-]*/gi)?.length ?? 0;
}

export function transcriptUsage(lines: string[]): Usage | undefined {
  const result = lines.map(parseJson(resultLineSchema)).findLast((line) => line !== undefined);
  if (result === undefined) return undefined;
  const { usage } = result;
  return {
    inputTokens: usage.input_tokens,
    cacheCreationTokens: usage.cache_creation_input_tokens,
    cacheReadTokens: usage.cache_read_input_tokens,
    outputTokens: usage.output_tokens,
  };
}

export function writeHtmlStats(lines: string[]): WriteHtmlStats {
  const stats: WriteHtmlStats = { calls: 0, elements: 0, htmlChars: 0, svgChars: 0 };
  for (const line of lines) {
    const assistant = parseJson(assistantLineSchema)(line);
    for (const block of assistant?.message.content ?? []) {
      const toolUse = toolUseSchema.safeParse(block);
      if (!toolUse.success || !toolUse.data.name.endsWith('__write_html')) continue;
      const input = htmlInputSchema.safeParse(toolUse.data.input);
      if (!input.success) continue;
      const { html } = input.data;
      stats.calls++;
      stats.elements += countElements(html);
      stats.htmlChars += html.length;
      stats.svgChars += (html.match(svgPattern) ?? []).reduce((sum, svg) => sum + svg.length, 0);
    }
  }
  return stats;
}

export function spread(values: number[]): Spread | undefined {
  if (values.length === 0) return undefined;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (values.length === 1) return { mean, sd: 0 };
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return { mean, sd: Math.sqrt(variance) };
}

export function formatSpread(value: Spread | undefined, digits = 1, unit = ''): string {
  if (value === undefined) return '–';
  return `${unit}${value.mean.toFixed(digits)} ±${value.sd.toFixed(digits)}`;
}

function parseJson<T>(schema: z.ZodType<T>): (line: string) => T | undefined {
  return (line) => {
    try {
      const parsed = schema.safeParse(JSON.parse(line));
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  };
}
