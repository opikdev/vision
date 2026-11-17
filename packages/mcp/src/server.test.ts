import { describe, expect, it } from 'vitest';
import { useSession } from './test-client';

const session = useSession();

describe('createServer', () => {
  it('lists every tool with its annotations', async () => {
    const { tools } = await session.client.listTools();
    expect(tools.map((tool) => [tool.name, tool.annotations])).toEqual([
      ['get_guide', { readOnlyHint: true, idempotentHint: true }],
      ['get_overview', { readOnlyHint: true, idempotentHint: true }],
      ['get_tree', { readOnlyHint: true, idempotentHint: true }],
      ['get_node', { readOnlyHint: true, idempotentHint: true }],
      ['validate', { readOnlyHint: true, idempotentHint: true }],
    ]);
  });

  it('requires file on every tool and describes every input', async () => {
    const { tools } = await session.client.listTools();
    for (const tool of tools) {
      expect(tool.inputSchema.required, tool.name).toContain('file');
      for (const [name, property] of Object.entries(tool.inputSchema.properties ?? {})) {
        expect(property, `${tool.name}.${name}`).toHaveProperty('description');
      }
    }
  });

  it('tells the model to start with get_guide', () => {
    expect(session.client.getInstructions()).toBe(
      "Vision designs are .vis files that the Vision app draws and redraws on every save. Call get_guide once before your first edit: it explains the format, the HTML that write_html accepts and the Tailwind classes. Always pass file as the absolute path of a .vis file; it doesn't need to exist yet, since the first edit creates it. After building or changing an artboard, check your work with validate and screenshot.",
    );
  });

  it.each([
    [
      'relative.vis',
      'file must be an absolute path, such as /Users/me/designs/app.vis, not "relative.vis"',
    ],
    ['/designs/app.json', 'file must be a .vis file, not "/designs/app.json"'],
  ])('rejects the file %s', async (file, message) => {
    expect(await session.call('get_overview', { file })).toEqual({
      text: `Input validation error: Invalid arguments for tool get_overview: file: ${message}`,
      isError: true,
      structured: undefined,
    });
  });
});
