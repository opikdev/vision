import type { VisionDocument } from '../schema';
import { contentRule } from './content';
import { artboardContext, type Rule } from './context';
import { contrastRule } from './contrast';
import { overflowRule } from './overflow';
import { overlapRule } from './overlap';
import type { ArtboardReview, Finding, Layout, ReviewReport, ReviewSeverity } from './schema';
import { spacingRule } from './spacing';
import { tokensRule } from './tokens';
import { touchTargetRule } from './touch-targets';
import { radiiRule, typeScaleRule } from './type-scale';

const rules: Rule[] = [
  contrastRule,
  overflowRule,
  overlapRule,
  spacingRule,
  typeScaleRule,
  radiiRule,
  tokensRule,
  touchTargetRule,
  contentRule,
];

export const severityWeights: Record<ReviewSeverity, number> = { error: 5, warning: 1, info: 0 };
const severityOrder: ReviewSeverity[] = ['error', 'warning', 'info'];
const minNodes = 20;

/**
 * Reviews a design's artboards. Rules that need the drawn layout run only when `layout` is given.
 * Throws when `artboardId` names no artboard.
 */
export function reviewDesign(
  document: VisionDocument,
  layout?: Layout,
  artboardId?: string,
): ReviewReport {
  const artboards: ArtboardReview[] = [];
  const findings: Finding[] = [];
  for (const page of document.pages) {
    for (const artboard of page.artboards) {
      if (artboardId !== undefined && artboard.id !== artboardId) continue;
      const context = artboardContext(document, page, artboard, layout);
      const found = rules.flatMap((rule) => rule(context));
      findings.push(...found);
      artboards.push({
        id: artboard.id,
        name: artboard.name,
        pageId: page.id,
        width: artboard.width,
        height: artboard.height,
        nodes: context.nodes.length,
        score: score(found, context.nodes.length),
        counts: countBySeverity(found),
      });
    }
  }
  if (artboardId !== undefined && artboards.length === 0) {
    throw new Error(`No artboard with id "${artboardId}"`);
  }
  const nodes = artboards.reduce((sum, artboard) => sum + artboard.nodes, 0);
  return {
    score: score(findings, nodes),
    nodes,
    counts: countBySeverity(findings),
    artboards,
    findings: severityOrder.flatMap((severity) =>
      findings.filter((found) => found.severity === severity),
    ),
  };
}

/** 100 minus the penalty per 100 nodes (5 per error, 1 per warning), floored at 0. */
export function score(findings: Finding[], nodes: number): number {
  const penalty = findings.reduce((sum, found) => sum + severityWeights[found.severity], 0);
  return Math.max(0, Math.round(100 - (penalty * 100) / Math.max(nodes, minNodes)));
}

function countBySeverity(findings: Finding[]): Record<ReviewSeverity, number> {
  return {
    error: findings.filter((found) => found.severity === 'error').length,
    warning: findings.filter((found) => found.severity === 'warning').length,
    info: findings.filter((found) => found.severity === 'info').length,
  };
}
