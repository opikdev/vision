import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '../test-client';

const session = useSession();
let file: string;

beforeEach(() => {
  file = join(session.dir, 'app.vis');
});

function design(children: unknown[]): string {
  return JSON.stringify({
    format: 'vision',
    version: 1,
    pages: [
      {
        id: 'p',
        name: 'P',
        artboards: [{ id: 'a', name: 'A', x: 0, y: 0, width: 100, height: 100, children }],
      },
    ],
  });
}

describe('validate', () => {
  it('says when there are no problems', async () => {
    await writeFile(file, design([{ type: 'text', id: 't', class: 'text-sm', text: 'x' }]));
    expect(await session.call('validate', { file })).toEqual({
      text: 'No problems.',
      isError: false,
      structured: undefined,
    });
  });

  it('lists unknown classes and missing images as warnings', async () => {
    await writeFile(
      file,
      design([
        { type: 'text', id: 't', class: 'flx', text: 'x' },
        { type: 'image', id: 'i', src: 'hero.png' },
      ]),
    );
    expect((await session.call('validate', { file })).text).toBe(
      [
        '0 errors, 2 warnings:',
        `- warning missing-asset at pages[0].artboards[0].children[1].src: Image file "hero.png" doesn't exist. Add the file at ${join(session.dir, 'app.assets', 'hero.png')}, or change src.`,
        '- warning unknown-class at pages[0].artboards[0].children[0].class: Unknown class "flx". Did you mean `flex`?',
      ].join('\n'),
    );
  });

  it('lists svg markup that cannot be drawn', async () => {
    await writeFile(file, design([{ type: 'svg', id: 's', svg: '<p>icon</p>' }]));
    expect((await session.call('validate', { file })).text).toBe(
      [
        '0 errors, 1 warning:',
        '- warning invalid-svg at line 1, pages[0].artboards[0].children[0].svg: SVG "s" can\'t be drawn: Expected a single <svg> element, got <p>. Wrap the drawing in one <svg viewBox="…">…</svg>.',
      ].join('\n'),
    );
  });

  it('lists errors, then warnings', async () => {
    await writeFile(
      file,
      design([
        { type: 'text', id: 't', text: 'x' },
        { type: 'text', id: 't', text: 'y' },
        { type: 'image', id: 'i', src: '../secret.png' },
      ]).replace(
        '"artboards":[',
        '"artboards":[{"id":"b","name":"B","x":50,"y":50,"width":10,"height":10,"children":[]},',
      ),
    );
    expect((await session.call('validate', { file })).text).toBe(
      [
        '2 errors, 1 warning:',
        '- error duplicate-id at line 1, pages[0].artboards[1].children[1].id: Duplicate id "t", already used by the node at pages.0.artboards.1.children.0. Ids are unique across pages, artboards and nodes. Rename one of them.',
        `- error asset-path at line 1, pages[0].artboards[1].children[2].src: Image src "../secret.png" is not inside the assets folder or an https: URL. Paths can't leave the assets folder; remove ".." and use a path such as "photos/hero.jpg".`,
        '- warning artboard-overlap at line 1, pages[0].artboards[1]: Artboard "A" overlaps "B". Move it to a free spot, such as x: 180, y: 0.',
      ].join('\n'),
    );
  });

  it('says when the file does not exist', async () => {
    expect((await session.call('validate', { file })).text).toBe(
      `${file} doesn't exist yet. The first edit creates it with page "page-1" and a 1440x900 artboard "desktop".`,
    );
  });
});
