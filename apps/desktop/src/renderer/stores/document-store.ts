import { create } from 'zustand';
import type { DocumentState } from '../../shared/contract';
import { reuseUnchanged } from './reuse-unchanged';

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
      state: isOlder(next, state) ? state : withReusedDocument(next, state),
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

function withReusedDocument(
  next: DocumentState | null,
  current: DocumentState | null,
): DocumentState | null {
  if (next === null || current?.path !== next.path) return next;
  return { ...next, document: reuseUnchanged(current.document, next.document) };
}
