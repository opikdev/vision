import type { Finding, ReviewReport } from '@vision/format';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFakeVision } from '../fake-vision';
import { useSession } from '../test-client';

const session = useSession();
let file: string;

const counts = { error: 1, warning: 1, info: 0 };
const contrast: Finding = {
  rule: 'contrast',
  severity: 'error',
  artboardId: 'cart',
  nodeId: 'note',
  message: 'Text "Free returns" is 2.3:1 on #FFFFFF; it needs 4.5:1.',
  fix: 'Use a darker color, such as #767676.',
};
const typeScale: Finding = {
  rule: 'type-scale',
  severity: 'warning',
  artboardId: 'cart',
  nodeId: 'cart',
  message: 'The artboard uses 8 font sizes; keep it to 6 or fewer.',
};

function report(findings: Finding[], overrides: Partial<ReviewReport> = {}): ReviewReport {
  return {
    score: 70,
    nodes: 20,
    counts,
    artboards: [
      {
        id: 'cart',
        name: 'Cart',
        pageId: 'shop',
        width: 390,
        height: 844,
        nodes: 20,
        score: 70,
        counts,
      },
    ],
    findings,
    ...overrides,
  };
}

async function logged(): Promise<string[]> {
  return (JSON.parse(await readFile(join(session.dir, 'log.json'), 'utf8')) as { args: string[] })
    .args;
}

beforeEach(async () => {
  file = join(session.dir, 'app.vis');
  vi.stubEnv('VISION_APP', await writeFakeVision(session.dir));
  vi.stubEnv('FAKE_VISION_LOG', join(session.dir, 'log.json'));
  await session.call('create_artboard', {
    file,
    id: 'cart',
    name: 'Cart',
    width: 390,
    height: 844,
  });
  await session.call('write_html', {
    file,
    parent: 'cart',
    html: '<p id="note" class="text-sm">Free returns</p>',
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('review', () => {
  it('lists findings by artboard with the layer, measurement and fix', async () => {
    vi.stubEnv('FAKE_VISION_REVIEW', JSON.stringify(report([contrast, typeScale])));
    expect(await session.call('review', { file })).toEqual({
      text: [
        'Score 70/100 with 1 error, 1 warning, 0 notes across 1 artboard.',
        'Fix every error, then the warnings, and review again. Each finding names the layer by its label and id, what was measured and how to fix it.',
        '',
        '"Cart" (cart): score 70, 1 error, 1 warning, 0 notes',
        '- error contrast on note: Text "Free returns" is 2.3:1 on #FFFFFF; it needs 4.5:1. Fix: Use a darker color, such as #767676.',
        '- warning type-scale: The artboard uses 8 font sizes; keep it to 6 or fewer.',
      ].join('\n'),
      isError: false,
      structured: { score: 70, counts },
    });
    const args = await logged();
    expect(args.slice(0, 1)).toEqual([`--vision-review=${file}`]);
    expect(args.some((arg) => arg.startsWith('--artboard'))).toBe(false);
  });

  it('reviews one artboard', async () => {
    vi.stubEnv('FAKE_VISION_REVIEW', JSON.stringify(report([])));
    expect((await session.call('review', { file, artboard: 'cart' })).text).toBe(
      "Score 70/100 with 1 error, 1 warning, 0 notes across 1 artboard.\nNothing to fix. Check the screenshot for what a review can't judge.",
    );
    expect(await logged()).toContain('--artboard=cart');
  });

  it('shows at most 40 findings and says how many more there are', async () => {
    const many = Array.from({ length: 43 }, () => typeScale);
    vi.stubEnv('FAKE_VISION_REVIEW', JSON.stringify(report(many)));
    const { text } = await session.call('review', { file });
    expect(text.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(40);
    expect(
      text.endsWith(
        '\n\n3 more findings not shown. Fix these first, or review one artboard at a time.',
      ),
    ).toBe(true);
  });

  it('rejects an artboard that does not exist without running the app', async () => {
    expect(await session.call('review', { file, artboard: 'payment' })).toEqual({
      text: 'No artboard has id "payment". Call get_overview to see the ids.',
      isError: true,
      structured: undefined,
    });
    await expect(access(join(session.dir, 'log.json'))).rejects.toThrow('ENOENT');
  });

  it('reports a review it cannot read', async () => {
    vi.stubEnv('FAKE_VISION_REVIEW', '{"score":"high"}');
    expect(await session.call('review', { file })).toEqual({
      text: "Vision wrote a review this vision-mcp can't read. Use the same version of Vision and vision-mcp.\nTo use another build of Vision, set VISION_APP to its executable, and VISION_APP_ENTRY to its app folder for a development build.",
      isError: true,
      structured: undefined,
    });
  });

  it('rejects a file that does not exist', async () => {
    const missing = join(session.dir, 'missing.vis');
    expect(await session.call('review', { file: missing })).toEqual({
      text: `${missing} doesn't exist yet. Create an artboard first.`,
      isError: true,
      structured: undefined,
    });
  });
});
