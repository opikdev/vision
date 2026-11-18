import { activitySchema, encodeActivity, maxNodes, type Activity } from '@vision/activity';
import {
  createArtboard,
  createDocument,
  deleteById,
  diffDocuments,
  findById,
  insertHtml,
  moveNode,
  setTokens,
  tokenGroups,
  updateArtboard,
  updateNode,
  type VisionDocument,
} from '@vision/format';
import { randomUUID } from 'node:crypto';
import { rename, writeFile } from 'node:fs/promises';
import { createConnection, type Socket } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';

const stepSchema = z.object({
  delayMs: z.number().nonnegative(),
  design: z.string().exactOptional(),
  activity: activitySchema,
});

export const recordingSchema = z.object({
  agent: z.string().min(1),
  start: z.string(),
  steps: z.array(stepSchema),
});

export type Recording = z.infer<typeof recordingSchema>;
export type RecordingStep = z.infer<typeof stepSchema>;

const contentSchema = z.looseObject({
  type: z.string(),
  id: z.string().exactOptional(),
  name: z.string().exactOptional(),
  input: z.record(z.string(), z.unknown()).exactOptional(),
  tool_use_id: z.string().exactOptional(),
  is_error: z.boolean().exactOptional(),
});

const lineSchema = z.looseObject({
  type: z.string(),
  timestamp: z.iso.datetime().exactOptional(),
  message: z.looseObject({ content: z.unknown() }).exactOptional(),
});

const optional = <Schema extends z.ZodType>(schema: Schema) => schema.exactOptional();

const toolInputs = {
  write_html: z.object({
    parent: z.string(),
    html: z.string(),
    index: optional(z.number()),
    replace: optional(z.boolean()),
  }),
  update_node: z.object({
    id: z.string(),
    name: optional(z.string().nullable()),
    class: optional(z.string().nullable()),
    text: optional(z.string().nullable()),
    src: optional(z.string().nullable()),
    alt: optional(z.string().nullable()),
    svg: optional(z.string().nullable()),
  }),
  move_node: z.object({ id: z.string(), parent: z.string(), index: optional(z.number()) }),
  delete: z.object({ id: z.string() }),
  set_tokens: z.object({
    tokens: z.partialRecord(z.enum(tokenGroups), z.record(z.string(), z.string().nullable())),
  }),
  create_artboard: z.object({
    name: z.string(),
    width: z.number(),
    height: z.number(),
    page: optional(z.string()),
    x: optional(z.number()),
    y: optional(z.number()),
    class: optional(z.string()),
    id: optional(z.string()),
  }),
  update_artboard: z.object({
    id: z.string(),
    name: optional(z.string()),
    x: optional(z.number()),
    y: optional(z.number()),
    width: optional(z.number()),
    height: optional(z.number()),
    class: optional(z.string().nullable()),
  }),
};

type EditTool = keyof typeof toolInputs;

const reads = new Set(['get_overview', 'get_tree', 'get_node', 'validate']);

interface Call {
  name: string;
  input: Record<string, unknown>;
  calledAt: number;
}

export function recordingFromTranscript(transcript: string, agent = 'Claude Code'): Recording {
  const start = createDocument();
  let design = start;
  const calls = new Map<string, Call>();
  const timed: { at: number; design?: string; activity: Activity }[] = [];
  let firstAt: number | undefined;
  for (const raw of transcript.split('\n')) {
    if (raw.trim() === '') continue;
    const line = lineSchema.parse(JSON.parse(raw));
    if (line.timestamp === undefined || !Array.isArray(line.message?.content)) continue;
    const at = Date.parse(line.timestamp);
    firstAt ??= at;
    for (const item of line.message.content) {
      const content = contentSchema.parse(item);
      if (content.type === 'tool_use' && content.id !== undefined) {
        const name = (content.name ?? '').replace(/^mcp__vision__/, '');
        calls.set(content.id, { name, input: content.input ?? {}, calledAt: at });
      }
      if (content.type !== 'tool_result' || content.is_error === true) continue;
      const call = calls.get(content.tool_use_id ?? '');
      if (call === undefined) continue;
      if (call.name in toolInputs) {
        const after = applyEdit(design, call.name as EditTool, call.input);
        timed.push({ at, design: JSON.stringify(after), activity: describeEdit(design, after) });
        design = after;
      } else {
        const look = describeLook(design, call);
        if (look !== undefined) timed.push({ at: call.calledAt, activity: look });
      }
    }
  }
  timed.sort((a, b) => a.at - b.at);
  const steps = timed.map(({ at, design, activity }, index) => ({
    delayMs: at - (timed[index - 1]?.at ?? firstAt ?? at),
    ...(design === undefined ? {} : { design }),
    activity,
  }));
  return { agent, start: JSON.stringify(start), steps };
}

function applyEdit(
  design: VisionDocument,
  tool: EditTool,
  input: Record<string, unknown>,
): VisionDocument {
  switch (tool) {
    case 'write_html':
      return insertHtml(design, toolInputs.write_html.parse(input)).document;
    case 'update_node': {
      const { id, ...patch } = toolInputs.update_node.parse(input);
      return updateNode(design, id, patch);
    }
    case 'move_node': {
      const { id, ...target } = toolInputs.move_node.parse(input);
      return moveNode(design, id, target);
    }
    case 'delete':
      return deleteById(design, toolInputs.delete.parse(input).id);
    case 'set_tokens':
      return setTokens(design, toolInputs.set_tokens.parse(input).tokens);
    case 'create_artboard':
      return createArtboard(design, toolInputs.create_artboard.parse(input)).document;
    case 'update_artboard': {
      const { id, ...patch } = toolInputs.update_artboard.parse(input);
      return updateArtboard(design, id, patch);
    }
  }
}

function describeEdit(before: VisionDocument, after: VisionDocument): Activity {
  const { touched, removed } = diffDocuments(before, after);
  const nodes = touched.flatMap(({ change, located }) =>
    located.kind === 'node' ? [{ change, id: located.node.id, artboard: located.artboard }] : [],
  );
  const first = nodes[0];
  if (first !== undefined) {
    const added = nodes.filter(({ change }) => change === 'added').length;
    return {
      kind: 'edit',
      artboard: first.artboard.id,
      nodes: nodes.slice(0, maxNodes).map(({ id }) => id),
      summary:
        added > 0
          ? `is adding ${plural(added, 'element')} to ${first.artboard.name}`
          : `is editing ${plural(nodes.length, 'element')} in ${first.artboard.name}`,
    };
  }
  for (const { change, located } of touched) {
    if (located.kind !== 'artboard') continue;
    const verb = change === 'added' ? 'adding' : 'editing';
    const summary = `is ${verb} the artboard ${located.artboard.name}`;
    return { kind: 'edit', artboard: located.artboard.id, nodes: [], summary };
  }
  const gone = removed.find((located) => located.kind === 'node');
  if (gone?.kind === 'node') {
    const { artboard, parent } = gone;
    return {
      kind: 'edit',
      artboard: artboard.id,
      nodes: parent === artboard ? [] : [parent.id],
      summary: `is removing ${plural(removed.length, 'element')} from ${artboard.name}`,
    };
  }
  const tokens = JSON.stringify(before.tokens) !== JSON.stringify(after.tokens);
  return {
    kind: 'edit',
    nodes: [],
    summary: tokens ? 'is updating tokens' : 'is editing the design',
  };
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function describeLook(design: VisionDocument, { name, input }: Call): Activity | undefined {
  if (reads.has(name)) return { kind: 'look', summary: 'is reading the design' };
  if (name !== 'screenshot' && name !== 'review') return undefined;
  const id = typeof input.artboard === 'string' ? input.artboard : undefined;
  const located = id === undefined ? undefined : findById(design, id);
  if (located?.kind !== 'artboard') return { kind: 'look', summary: 'is reviewing the design' };
  const verb = name === 'screenshot' ? 'is taking a screenshot of' : 'is reviewing';
  return {
    kind: 'look',
    artboard: located.artboard.id,
    summary: `${verb} ${located.artboard.name}`,
  };
}

export interface ReplayOptions {
  file: string;
  socket: string;
  speed?: number;
  onStep?: (step: RecordingStep, index: number) => void;
}

export async function replay(
  recording: Recording,
  { file, socket, speed = 1, onStep }: ReplayOptions,
): Promise<void> {
  const session = randomUUID();
  const connection = await connect(socket);
  const send = (activity: Activity) => {
    const line = encodeActivity({
      v: 1,
      session,
      agent: recording.agent,
      file,
      at: Date.now(),
      activity,
    });
    if (line !== undefined) connection.write(line);
  };
  try {
    for (const [index, step] of recording.steps.entries()) {
      await sleep(step.delayMs / speed);
      if (step.design !== undefined) await save(file, step.design);
      send(step.activity);
      onStep?.(step, index);
    }
    send({ kind: 'done' });
  } finally {
    connection.end();
  }
}

export async function save(file: string, design: string): Promise<void> {
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, design);
  await rename(temp, file);
}

function connect(path: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(path);
    socket.once('connect', () => {
      resolve(socket);
    });
    socket.once('error', reject);
  });
}
