import type { Page, VisionDocument } from '@vision/format';
import { useDocumentStore } from '../../stores/document-store';
import { useViewStore } from '../../stores/view-store';

export function pageIn(document: VisionDocument | null, pageId: string | null): Page | undefined {
  return document?.pages.find((page) => page.id === pageId) ?? document?.pages[0];
}

export function useCurrentPage(): Page | undefined {
  const document = useDocumentStore((store) => store.state?.document ?? null);
  const pageId = useViewStore((store) => store.pageId);
  return pageIn(document, pageId);
}

export function currentPage(): Page | undefined {
  return pageIn(
    useDocumentStore.getState().state?.document ?? null,
    useViewStore.getState().pageId,
  );
}
