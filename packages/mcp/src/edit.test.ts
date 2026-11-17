import { createPage } from '@vision/format';
import { readDesign } from '@vision/format/node';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Design from './design';
import { runEdit } from './edit';

vi.mock('./design', async (importOriginal) => ({
  ...(await importOriginal<typeof Design>()),
  fileChecks: () => Promise.reject(new Error('Tailwind failed to load')),
}));

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vision-mcp-edit-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('runEdit', () => {
  it('reports a saved edit as saved when checking for warnings fails', async () => {
    const file = join(dir, 'app.vis');
    const result = await runEdit(
      file,
      () => undefined,
      (doc) => ({
        document: createPage(doc, { name: 'Shop', id: 'shop' }).document,
        summary: 'Added page shop.',
      }),
    );
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: [
            `Created ${file} with page "page-1" and artboard "desktop".`,
            'Added page shop.',
            '',
            'The edit was saved, but checking it for new warnings failed: Tailwind failed to load',
          ].join('\n'),
        },
      ],
    });
    const { result: saved } = await readDesign(file);
    expect(saved.ok && saved.document.pages.map((page) => page.id)).toEqual(['page-1', 'shop']);
  });
});
