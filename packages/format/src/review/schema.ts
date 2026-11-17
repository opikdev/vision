import { z } from 'zod';

export const reviewRules = [
  'contrast',
  'overflow',
  'overlap',
  'spacing',
  'type-scale',
  'radii',
  'tokens',
  'touch-target',
  'content',
] as const;

export const reviewSeverities = ['error', 'warning', 'info'] as const;

const px = z.number();
const rgba = z.tuple([
  z.number().min(0).max(255),
  z.number().min(0).max(255),
  z.number().min(0).max(255),
  z.number().min(0).max(1),
]);
const side = z.tuple([px, px, px, px]);

/** One drawn element, measured in its artboard's pixels by the Vision app. */
export const measuredBoxSchema = z
  .object({
    x: px,
    y: px,
    width: px,
    height: px,
    clientWidth: px,
    clientHeight: px,
    scrollWidth: px,
    scrollHeight: px,
    visible: z.boolean(),
    display: z.string().max(40),
    position: z.string().max(40),
    overflowX: z.string().max(40),
    overflowY: z.string().max(40),
    textOverflow: z.string().max(40),
    lineClamp: z.boolean(),
    transformed: z.boolean(),
    gridArea: z.string().max(200),
    color: rgba,
    background: rgba,
    backgroundImage: z.boolean(),
    borderWidth: px,
    radius: px,
    fontSize: px,
    fontWeight: px,
    lineHeight: px.nullable(),
    fontFamily: z.string().max(500),
    padding: side,
    margin: z.tuple([px.nullable(), px.nullable(), px.nullable(), px.nullable()]),
    rowGap: px.nullable(),
    columnGap: px.nullable(),
    cursor: z.string().max(40),
  })
  .strict();

/** Measured boxes by node id; each artboard's root box is keyed by the artboard id. */
export const layoutSchema = z.record(z.string().max(200), measuredBoxSchema);

const counts = z.object({
  error: z.number().int().min(0),
  warning: z.number().int().min(0),
  info: z.number().int().min(0),
});

export const findingSchema = z.object({
  rule: z.enum(reviewRules),
  severity: z.enum(reviewSeverities),
  artboardId: z.string(),
  nodeId: z.string(),
  message: z.string(),
  fix: z.string().optional(),
});

export const reviewReportSchema = z.object({
  score: z.number(),
  nodes: z.number().int().min(0),
  counts,
  artboards: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      pageId: z.string(),
      width: z.number(),
      height: z.number(),
      nodes: z.number().int().min(0),
      score: z.number(),
      counts,
    }),
  ),
  findings: z.array(findingSchema),
});

export type Rgba = z.infer<typeof rgba>;
export type MeasuredBox = z.infer<typeof measuredBoxSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type ReviewRule = (typeof reviewRules)[number];
export type ReviewSeverity = (typeof reviewSeverities)[number];
export type Finding = z.infer<typeof findingSchema>;
export type ReviewReport = z.infer<typeof reviewReportSchema>;
export type ArtboardReview = ReviewReport['artboards'][number];
