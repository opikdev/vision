export type Samples = Record<string, number[]>;

export interface Summary {
  median: number;
  p95: number;
}

export function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = values.toSorted((a, b) => a - b);
  const index = Math.ceil(fraction * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))] ?? Number.NaN;
}

export function summarize(samples: Samples): Record<string, Summary> {
  return Object.fromEntries(
    Object.entries(samples).map(([metric, values]) => [
      metric,
      { median: percentile(values, 0.5), p95: percentile(values, 0.95) },
    ]),
  );
}

export function formatReport(
  summaries: Record<string, Record<string, Summary>>,
  machine: string,
): string {
  const sizes = Object.keys(summaries);
  const metrics = [...new Set(sizes.flatMap((size) => Object.keys(summaries[size] ?? {})))];
  const header = ['Metric', ...sizes.flatMap((size) => [`${size} median`, `${size} p95`])];
  const rows = metrics.map((metric) => [
    metric,
    ...sizes.flatMap((size) => {
      const summary = summaries[size]?.[metric];
      return summary === undefined ? ['', ''] : [round(summary.median), round(summary.p95)];
    }),
  ]);
  return [
    `Vision bench on ${machine}`,
    '',
    `| ${header.join(' | ')} |`,
    `| ${header.map((_, index) => (index === 0 ? '---' : '---:')).join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
  ].join('\n');
}

function round(value: number): string {
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}
