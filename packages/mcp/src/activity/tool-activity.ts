import {
  CLIENT_INFO_META_KEY,
  type McpServer,
  type ServerContext,
} from '@modelcontextprotocol/server';
import { agentName, type ClientInfo } from '@vision/activity';
import type { Artboard, VisionDocument } from '@vision/format';
import { z } from 'zod';
import { describeEdit, describeReading, describeScreenshot } from './describe';
import type { ActivityReporter } from './reporter';

export type EditListener = (before: VisionDocument, after: VisionDocument) => void;

export interface ToolActivity {
  reading(ctx: ServerContext, file: string): void;
  screenshotting(ctx: ServerContext, file: string, artboard: Artboard): void;
  editing(ctx: ServerContext, file: string): EditListener;
}

export const quietActivity: ToolActivity = {
  reading: () => undefined,
  screenshotting: () => undefined,
  editing: () => () => undefined,
};

export function reportActivity(server: McpServer, reporter: ActivityReporter): ToolActivity {
  const agentOf = (ctx: ServerContext): string => agentName(clientInfo(server, ctx));
  return {
    reading: (ctx, file) => {
      reporter.report({ agent: agentOf(ctx), file, activity: describeReading() });
    },
    screenshotting: (ctx, file, artboard) => {
      reporter.report({ agent: agentOf(ctx), file, activity: describeScreenshot(artboard) });
    },
    editing: (ctx, file) => (before, after) => {
      reporter.report({ agent: agentOf(ctx), file, activity: describeEdit(before, after) });
    },
  };
}

const clientInfoSchema = z.object({ name: z.string().optional(), title: z.string().optional() });

function clientInfo(server: McpServer, ctx: ServerContext): ClientInfo | undefined {
  const envelope: Record<string, unknown> | undefined = ctx.mcpReq.envelope;
  const declared = clientInfoSchema.safeParse(envelope?.[CLIENT_INFO_META_KEY]);
  if (declared.success) return declared.data;
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- 2025-era clients name themselves only in initialize
  return server.server.getClientVersion();
}
