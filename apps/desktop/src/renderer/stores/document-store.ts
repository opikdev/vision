import { create } from 'zustand';
import type { DocumentState } from '../../shared/contract';

interface DocumentStore {
  loaded: boolean;
  state: DocumentState | null;
  receive: (state: DocumentState | null) => void;
}

export const useDocumentStore = create<DocumentStore>()((set) => ({
  loaded: false,
  state: null,
  receive: (next) => {
    set(({ state }) => ({
      loaded: true,
      state: isOlder(next, state) ? state : next,
    }));
  },
}));

function isOlder(next: DocumentState | null, current: DocumentState | null): boolean {
  return (
    next !== null &&
    current !== null &&
    next.path === current.path &&
    next.revision <= current.revision
  );
}
