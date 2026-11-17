import { z } from 'zod';

const optionalString = z.string().exactOptional();

export const tokenGroups = ['color', 'font', 'text', 'radius', 'shadow', 'spacing'] as const;

const tokenMap = z.record(z.string(), z.string()).exactOptional();

export const tokensSchema = z
  .object({
    color: tokenMap,
    font: tokenMap,
    text: tokenMap,
    radius: tokenMap,
    shadow: tokenMap,
    spacing: tokenMap,
  })
  .strict();

export const frameNodeSchema = z
  .object({
    type: z.literal('frame'),
    id: z.string(),
    name: optionalString,
    class: optionalString,
    get children(): z.ZodOptional<z.ZodArray<typeof nodeSchema>> {
      return z.array(nodeSchema).optional();
    },
  })
  .strict();

export const textNodeSchema = z
  .object({
    type: z.literal('text'),
    id: z.string(),
    name: optionalString,
    class: optionalString,
    text: z.string(),
  })
  .strict();

export const imageNodeSchema = z
  .object({
    type: z.literal('image'),
    id: z.string(),
    name: optionalString,
    class: optionalString,
    src: z.string(),
    alt: optionalString,
  })
  .strict();

export const svgNodeSchema = z
  .object({
    type: z.literal('svg'),
    id: z.string(),
    name: optionalString,
    class: optionalString,
    svg: z.string(),
  })
  .strict();

export const nodeSchema = z.discriminatedUnion('type', [
  frameNodeSchema,
  textNodeSchema,
  imageNodeSchema,
  svgNodeSchema,
]);

export const artboardSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number().min(1).max(10000),
    height: z.number().min(1).max(10000),
    class: optionalString,
    children: z.array(nodeSchema),
  })
  .strict();

export const pageSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    artboards: z.array(artboardSchema),
  })
  .strict();

export const documentSchema = z
  .object({
    format: z.literal('vision'),
    version: z.literal(1),
    tokens: tokensSchema.exactOptional(),
    pages: z.array(pageSchema).min(1),
  })
  .strict();

export type TokenGroup = (typeof tokenGroups)[number];
export type Tokens = z.infer<typeof tokensSchema>;
export type FrameNode = z.infer<typeof frameNodeSchema>;
export type TextNode = z.infer<typeof textNodeSchema>;
export type ImageNode = z.infer<typeof imageNodeSchema>;
export type SvgNode = z.infer<typeof svgNodeSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type Artboard = z.infer<typeof artboardSchema>;
export type Page = z.infer<typeof pageSchema>;
export type VisionDocument = z.infer<typeof documentSchema>;
