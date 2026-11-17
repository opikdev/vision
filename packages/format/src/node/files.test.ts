import { writeFileSync } from 'node:fs';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  stat,
  symlink,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDocument } from '../create';
import { createArtboard } from '../edit/artboard';
import { EditError } from '../edit/error';
import { insertHtml } from '../edit/node';
import { createPage } from '../edit/page';
import { serializeDocument } from '../serialize';
import { docWith } from '../test-fixtures';
import { assetDiagnostics } from './assets';
import { editDesign } from './edit';
import { readDesign } from './read';
import { writeDesign } from './write';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vision-format-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('readDesign', () => {
  it('treats a missing file as a new design', async () => {
    expect(await readDesign(join(dir, 'new.vis'))).toEqual({
      text: '',
      exists: false,
      result: { ok: true, document: createDocument(), diagnostics: [] },
    });
  });

  it('parses an existing file', async () => {
    const path = join(dir, 'a.vis');
    await writeFile(path, '{ "format": "vision" ');
    const { exists, text, result } = await readDesign(path);
    expect([exists, text, result.ok, result.diagnostics[0]?.code]).toEqual([
      true,
      '{ "format": "vision" ',
      false,
      'json-syntax',
    ]);
  });
});

async function writeSparse(path: string, bytes: number): Promise<void> {
  const file = await open(path, 'w');
  await file.truncate(bytes);
  await file.close();
}

describe('readDesign and editDesign on a file over 20 MB', () => {
  it('reports the size instead of reading it', async () => {
    const path = join(dir, 'checkout.vis');
    await writeSparse(path, 210 * 1024 * 1024);
    expect(await readDesign(path)).toEqual({
      text: '',
      exists: true,
      result: {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            code: 'file-too-large',
            message: 'checkout.vis is 210 MB; Vision opens files up to 20 MB',
            path: [],
          },
        ],
      },
    });
    await expect(editDesign(path, (doc) => doc)).rejects.toThrow(
      `${path} can't be edited: error file-too-large at (document): checkout.vis is 210 MB; Vision opens files up to 20 MB.`,
    );
  });

  it('still reads a file of exactly 20 MB', async () => {
    const path = join(dir, 'checkout.vis');
    await writeSparse(path, 20 * 1024 * 1024);
    expect((await readDesign(path)).result.diagnostics.map((d) => d.code)).toEqual(['json-syntax']);
  });
});

describe('writeDesign', () => {
  it('creates folders, writes deterministically and leaves no temp files', async () => {
    const path = join(dir, 'nested', 'deeper', 'a.vis');
    await writeDesign(path, createDocument());
    expect(await readFile(path, 'utf8')).toBe(serializeDocument(createDocument()));
    expect(await readdir(join(dir, 'nested', 'deeper'))).toEqual(['a.vis']);
  });

  it('replaces the file in one step', async () => {
    const path = join(dir, 'a.vis');
    await writeFile(path, 'old');
    await writeDesign(path, createDocument());
    expect(await readFile(path, 'utf8')).toBe(serializeDocument(createDocument()));
    expect(await readdir(dir)).toEqual(['a.vis']);
  });

  it('cleans up its temp file when the rename fails', async () => {
    const path = join(dir, 'taken');
    await mkdir(join(path, 'child'), { recursive: true });
    await expect(writeDesign(path, createDocument())).rejects.toThrow();
    expect(await readdir(dir)).toEqual(['taken']);
  });
});

describe('editDesign', () => {
  it('creates a missing file from a new design', async () => {
    const path = join(dir, 'new.vis');
    const { document, diagnostics } = await editDesign(
      path,
      (doc) => createPage(doc, { name: 'Flow', id: 'flow' }).document,
    );
    expect(document.pages.map((page) => page.id)).toEqual(['page-1', 'flow']);
    expect(diagnostics).toEqual([]);
    expect(await readFile(path, 'utf8')).toBe(serializeDocument(document));
  });

  it('refuses to edit a file with JSON or schema errors', async () => {
    const path = join(dir, 'broken.vis');
    await writeFile(path, '{ "format": "vision", "version": 1, "pages": [], "extra": 1 }');
    const edit = editDesign(path, (doc) => doc);
    await expect(edit).rejects.toThrow(EditError);
    await expect(edit).rejects.toThrow(
      `${path} can't be edited until these problems are fixed by hand:\n- error schema at line 1, pages: "pages" needs at least 1 item.\n- error schema at line 1, extra: Unknown field "extra". Remove it. Allowed fields here: format, version, tokens, pages.`,
    );
    expect(await readFile(path, 'utf8')).toBe(
      '{ "format": "vision", "version": 1, "pages": [], "extra": 1 }',
    );
  });

  it('rejects an edit that adds an error and leaves the file untouched', async () => {
    const path = join(dir, 'a.vis');
    await editDesign(
      path,
      (doc) => createArtboard(doc, { name: 'Copy', id: 'copy', width: 10, height: 10 }).document,
    );
    const before = await readFile(path, 'utf8');
    await expect(
      editDesign(path, (doc) => {
        const next = structuredClone(doc);
        next.pages[0]?.artboards.push({
          id: 'copy',
          name: 'Again',
          x: 5000,
          y: 0,
          width: 1,
          height: 1,
          children: [],
        });
        return next;
      }),
    ).rejects.toThrow(
      'The edit was rejected because it adds errors:\n- error duplicate-id at pages[0].artboards[2].id: Duplicate id "copy", already used by the artboard at pages.0.artboards.1. Ids are unique across pages, artboards and nodes. Rename one of them.',
    );
    expect(await readFile(path, 'utf8')).toBe(before);
  });

  it('allows edits to a file whose existing errors stay the same', async () => {
    const path = join(dir, 'a.vis');
    await writeFile(
      path,
      serializeDocument(docWith([{ type: 'image', id: 'img', src: '../x.png' }])),
    );
    const { diagnostics } = await editDesign(
      path,
      (doc) => insertHtml(doc, { parent: 'board', html: '<p>Hi</p>' }).document,
    );
    expect(diagnostics.map((d) => d.code)).toEqual(['asset-path']);
    await expect(
      editDesign(
        path,
        (doc) => insertHtml(doc, { parent: 'board', html: '<img src="/abs.png">' }).document,
      ),
    ).rejects.toThrow('Image src "/abs.png" is not inside the assets folder');
  });

  it('rejects edits that produce schema errors', async () => {
    const path = join(dir, 'a.vis');
    await expect(editDesign(path, (doc) => ({ ...doc, pages: [] }))).rejects.toThrow(
      '"pages" needs at least 1 item',
    );
  });

  it('edits the target of a symlink and keeps the link', async () => {
    const real = join(dir, 'real.vis');
    const link = join(dir, 'link.vis');
    await writeDesign(real, createDocument());
    await symlink(real, link);
    await editDesign(link, (doc) => createPage(doc, { name: 'Flow', id: 'flow' }).document);
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    const { result } = await readDesign(real);
    expect(result.ok && result.document.pages.map((page) => page.id)).toEqual(['page-1', 'flow']);
  });

  it("keeps the file's permissions", async () => {
    const path = join(dir, 'a.vis');
    await writeDesign(path, createDocument());
    await chmod(path, 0o600);
    await editDesign(path, (doc) => createPage(doc, { name: 'Flow' }).document);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  it('rejects the edit when the file changes while it is being applied', async () => {
    const path = join(dir, 'a.vis');
    await writeDesign(path, createDocument());
    const external = serializeDocument(createPage(createDocument(), { name: 'Theirs' }).document);
    await expect(
      editDesign(path, (doc) => {
        writeFileSync(path, external);
        return createPage(doc, { name: 'Mine' }).document;
      }),
    ).rejects.toThrow(
      new EditError('a.vis changed while this edit was being applied. Read it again and retry.'),
    );
    expect(await readFile(path, 'utf8')).toBe(external);
    expect(await readdir(dir)).toEqual(['a.vis']);
  });

  it('rejects the edit when the file appears while it is being applied', async () => {
    const path = join(dir, 'a.vis');
    await expect(
      editDesign(path, (doc) => {
        writeFileSync(path, 'theirs');
        return doc;
      }),
    ).rejects.toThrow('a.vis changed while this edit was being applied');
    expect(await readFile(path, 'utf8')).toBe('theirs');
  });

  it('runs concurrent edits to the same file one after another', async () => {
    const path = join(dir, 'a.vis');
    const names = ['One', 'Two', 'Three', 'Four', 'Five'];
    const failing = editDesign(path, () => {
      throw new EditError('nope');
    });
    const results = await Promise.all(
      names.map((name) => editDesign(path, (doc) => createPage(doc, { name }).document)),
    );
    await expect(failing).rejects.toThrow('nope');
    expect(results.map((result) => result.document.pages.length)).toEqual([2, 3, 4, 5, 6]);
    const { result } = await readDesign(path);
    expect(result.ok && result.document.pages.map((page) => page.name)).toEqual([
      'Page 1',
      ...names,
    ]);
  });
});

describe('assetDiagnostics', () => {
  it('warns about relative image files that are missing', async () => {
    const path = join(dir, 'checkout.vis');
    await mkdir(join(dir, 'checkout.assets', 'photos'), { recursive: true });
    await writeFile(join(dir, 'checkout.assets', 'photos', 'here.jpg'), '');
    const doc = docWith([
      { type: 'image', id: 'here', src: 'photos/here.jpg' },
      { type: 'image', id: 'gone', src: 'photos/gone.jpg' },
      { type: 'image', id: 'remote', src: 'https://example.com/a.png' },
      { type: 'image', id: 'escape', src: '../x.png' },
    ]);
    expect(await assetDiagnostics(path, doc)).toEqual([
      {
        severity: 'warning',
        code: 'missing-asset',
        message: 'Image file "photos/gone.jpg" doesn\'t exist',
        hint: `Add the file at ${join(dir, 'checkout.assets', 'photos', 'gone.jpg')}, or change src.`,
        path: ['pages', 0, 'artboards', 0, 'children', 1, 'src'],
        pageId: 'page',
        artboardId: 'board',
        nodeId: 'gone',
      },
    ]);
  });

  it('treats image files it cannot reach as missing', async () => {
    const path = join(dir, 'checkout.vis');
    await mkdir(join(dir, 'checkout.assets', 'locked'), { recursive: true });
    await writeFile(join(dir, 'checkout.assets', 'file.png'), '');
    await chmod(join(dir, 'checkout.assets', 'locked'), 0o000);
    const doc = docWith([
      { type: 'image', id: 'locked', src: 'locked/a.png' },
      { type: 'image', id: 'under-file', src: 'file.png/a.png' },
    ]);
    try {
      expect((await assetDiagnostics(path, doc)).map((d) => [d.code, d.nodeId])).toEqual([
        ['missing-asset', 'locked'],
        ['missing-asset', 'under-file'],
      ]);
    } finally {
      await chmod(join(dir, 'checkout.assets', 'locked'), 0o755);
    }
  });
});
