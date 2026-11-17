import { beforeEach, describe, expect, it } from 'vitest';
import type { VisionDocument } from '@vision/format';
import type { DocumentState } from '../../shared/contract';
import { useDocumentStore } from './document-store';

function state(
  path: string,
  revision: number,
  document: VisionDocument | null = null,
): DocumentState {
  return {
    revision,
    path,
    displayPath: path,
    name: 'a.vis',
    status: 'ok',
    document,
    diagnostics: [],
    readError: null,
    mtimeMs: 1,
    assetToken: 't',
    assetsVersion: 0,
  };
}

beforeEach(() => {
  useDocumentStore.setState({ loaded: false, state: null });
});

describe('useDocumentStore', () => {
  it('ignores a state older than the one shown', () => {
    const { receive } = useDocumentStore.getState();
    receive(state('/a.vis', 3));
    receive(state('/a.vis', 2));
    expect(useDocumentStore.getState().state?.revision).toBe(3);
  });

  it('accepts the first state for a newly opened file', () => {
    const { receive } = useDocumentStore.getState();
    receive(null);
    expect(useDocumentStore.getState()).toMatchObject({ loaded: true, state: null });
    receive(state('/b.vis', 1));
    expect(useDocumentStore.getState().state?.path).toBe('/b.vis');
  });

  it('keeps the objects of artboards a save left unchanged', () => {
    const design = (text: string): VisionDocument => ({
      format: 'vision',
      version: 1,
      pages: [
        {
          id: 'page',
          name: 'Page',
          artboards: [
            { id: 'a', name: 'A', x: 0, y: 0, width: 10, height: 10, children: [] },
            {
              id: 'b',
              name: 'B',
              x: 20,
              y: 0,
              width: 10,
              height: 10,
              children: [{ type: 'text', id: 't', text }],
            },
          ],
        },
      ],
    });
    const { receive } = useDocumentStore.getState();
    receive(state('/a.vis', 1, design('One')));
    const [a, b] = useDocumentStore.getState().state?.document?.pages[0]?.artboards ?? [];
    receive(state('/a.vis', 2, design('Two')));
    const [nextA, nextB] = useDocumentStore.getState().state?.document?.pages[0]?.artboards ?? [];
    expect(nextA).toBe(a);
    expect(nextB).not.toBe(b);
    expect(nextB?.children).toEqual([{ type: 'text', id: 't', text: 'Two' }]);

    receive(state('/b.vis', 1, design('Two')));
    expect(useDocumentStore.getState().state?.document?.pages[0]?.artboards[0]).not.toBe(a);
  });
});
