import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentState } from '../../shared/contract';
import { useDocumentStore } from './document-store';

function state(path: string, revision: number): DocumentState {
  return {
    revision,
    path,
    displayPath: path,
    name: 'a.vis',
    status: 'ok',
    document: null,
    diagnostics: [],
    mtimeMs: 1,
    assetToken: 't',
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
});
