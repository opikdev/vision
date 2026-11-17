import { z } from 'zod';
export { selectionSchema } from '@vision/activity';
import { appCommands } from './contract';

export const pathSchema = z.string().min(1).max(4096);

export const appCommandSchema = z.enum(appCommands);

export const clipboardTextSchema = z.string().max(1_000_000);

export const captureMessageSchema = z.string().max(2000);

export const captureParamsSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('capture'), artboard: z.string().min(1) }),
  z.object({ mode: z.literal('review'), artboard: z.string().min(1).optional() }),
]);
