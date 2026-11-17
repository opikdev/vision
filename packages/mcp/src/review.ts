import { reviewReportSchema, type Finding, type ReviewReport } from '@vision/format';
import { plural } from './design';
import { runApp, VisionAppError, type VisionApp } from './vision-app';

export const maxFindings = 40;

export async function takeReview(
  app: VisionApp,
  file: string,
  artboard: string | undefined,
): Promise<ReviewReport> {
  const json = await runApp(app, {
    prefix: 'vision-review-',
    action: 'review the design',
    output: 'review.json',
    written: 'the review',
    args: (out) => [
      `--vision-review=${file}`,
      `--out=${out}`,
      ...(artboard === undefined ? [] : [`--artboard=${artboard}`]),
    ],
  });
  const report = reviewReportSchema.safeParse(parseJson(json.toString('utf8')));
  if (!report.success) {
    throw new VisionAppError(
      "Vision wrote a review this vision-mcp can't read. Use the same version of Vision and vision-mcp.",
    );
  }
  return report.data;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** The report as text: findings grouped by artboard, most severe first, at most `maxFindings`. */
export function describeReport(report: ReviewReport): string {
  const shown = report.findings.slice(0, maxFindings);
  const lines = [
    `Score ${report.score}/100 with ${counted(report.counts)} across ${plural(report.artboards.length, 'artboard')}.`,
  ];
  if (report.findings.length === 0) {
    lines.push("Nothing to fix. Check the screenshot for what a review can't judge.");
    return lines.join('\n');
  }
  lines.push(
    'Fix every error, then the warnings, and review again. Each finding names the layer by its label and id, what was measured and how to fix it.',
  );
  for (const artboard of report.artboards) {
    const found = shown.filter((finding) => finding.artboardId === artboard.id);
    lines.push(
      '',
      `${JSON.stringify(artboard.name)} (${artboard.id}): score ${artboard.score}, ${counted(artboard.counts)}`,
    );
    lines.push(...found.map((finding) => `- ${describeFinding(finding)}`));
  }
  const hidden = report.findings.length - shown.length;
  if (hidden > 0) {
    lines.push(
      '',
      `${plural(hidden, 'more finding')} not shown. Fix these first, or review one artboard at a time.`,
    );
  }
  return lines.join('\n');
}

function describeFinding(finding: Finding): string {
  const layer = finding.nodeId === finding.artboardId ? '' : ` on ${finding.nodeId}`;
  const fix = finding.fix === undefined ? '' : ` Fix: ${finding.fix}`;
  return `${finding.severity} ${finding.rule}${layer}: ${finding.message}${fix}`;
}

function counted(counts: ReviewReport['counts']): string {
  return [
    plural(counts.error, 'error'),
    plural(counts.warning, 'warning'),
    plural(counts.info, 'note'),
  ].join(', ');
}
