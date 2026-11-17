import { diffDocuments, type DocumentChange, type VisionDocument } from '@vision/format';

export function changedNodes(before: VisionDocument, after: VisionDocument): DocumentChange[] {
  const previous = new Set(before.pages.flatMap((page) => page.artboards));
  const kept = new Set(
    after.pages.flatMap((page) => page.artboards).filter((artboard) => previous.has(artboard)),
  );
  const withoutKept = (document: VisionDocument): VisionDocument => ({
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      artboards: page.artboards.filter((artboard) => !kept.has(artboard)),
    })),
  });
  return diffDocuments(withoutKept(before), withoutKept(after)).touched.filter(
    ({ located }) => located.kind === 'node',
  );
}
