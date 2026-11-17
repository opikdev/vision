import { sanitizeSvg, SvgError, type Node, type VisionDocument } from '@vision/format';

export function sanitizeDocument(doc: VisionDocument): VisionDocument {
  return {
    ...doc,
    pages: doc.pages.map((page) => ({
      ...page,
      artboards: page.artboards.map((artboard) => ({
        ...artboard,
        children: sanitizeNodes(artboard.children),
      })),
    })),
  };
}

function sanitizeNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    if (node.type === 'frame' && node.children !== undefined) {
      return { ...node, children: sanitizeNodes(node.children) };
    }
    if (node.type !== 'svg') return node;
    try {
      return { ...node, svg: sanitizeSvg(node.svg) };
    } catch (error) {
      if (error instanceof SvgError) return { ...node, svg: '' };
      throw error;
    }
  });
}
