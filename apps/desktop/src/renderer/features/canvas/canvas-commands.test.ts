import { createDocument, type VisionDocument } from '@vision/format';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDocumentStore } from '../../stores/document-store';
import { useViewStore } from '../../stores/view-store';
import { resizeCanvas, runCanvasCommand } from './canvas-commands';

function squareDesign(): VisionDocument {
  const document = createDocument();
  const [page] = document.pages;
  const [artboard] = page?.artboards ?? [];
  if (page === undefined || artboard === undefined) throw new Error('No artboard');
  const square = {
    ...artboard,
    width: 1000,
    height: 1000,
    children: [{ type: 'text' as const, id: 'title', text: 'Hi' }],
  };
  return { ...document, pages: [{ ...page, artboards: [square] }] };
}

beforeEach(() => {
  useViewStore.setState({ pageId: null, viewports: {}, fitted: {}, canvasSize: null });
  useDocumentStore.setState({
    loaded: true,
    state: {
      revision: 1,
      path: '/a.vis',
      displayPath: '/a.vis',
      name: 'a.vis',
      status: 'ok',
      document: squareDesign(),
      diagnostics: [],
      readError: null,
      mtimeMs: 1,
      assetToken: 't',
      assetsVersion: 0,
    },
  });
  resizeCanvas({ width: 628, height: 628 });
});

const viewport = () => useViewStore.getState().viewports['page-1'];

describe('resizeCanvas', () => {
  it('refits a page that is fitted to the canvas', () => {
    runCanvasCommand('zoom-fit');
    expect(viewport()).toEqual({ x: 64, y: 64, zoom: 0.5 });

    resizeCanvas({ width: 1128, height: 1128 });

    expect(viewport()).toEqual({ x: 64, y: 64, zoom: 1 });
  });

  it('keeps a viewport the user moved', () => {
    runCanvasCommand('zoom-fit');
    useViewStore.getState().setViewport('page-1', { x: 10, y: 20, zoom: 0.8 });

    resizeCanvas({ width: 1128, height: 1128 });

    expect(viewport()).toEqual({ x: 10, y: 20, zoom: 0.8 });
  });
});
