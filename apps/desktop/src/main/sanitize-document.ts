import {
  sanitizeSvg,
  SvgError,
  type Diagnostic,
  type JsonPath,
  type Node,
  type VisionDocument,
} from '@vision/format';

interface Context {
  path: JsonPath;
  pageId: string;
  artboardId: string;
  diagnostics: Diagnostic[];
}

export function sanitizeDocument(doc: VisionDocument): {
  document: VisionDocument;
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  const pages = doc.pages.map((page, pageIndex) => ({
    ...page,
    artboards: page.artboards.map((artboard, artboardIndex) => ({
      ...artboard,
      children: sanitizeNodes(artboard.children, {
        path: ['pages', pageIndex, 'artboards', artboardIndex],
        pageId: page.id,
        artboardId: artboard.id,
        diagnostics,
      }),
    })),
  }));
  return { document: { ...doc, pages }, diagnostics };
}

function sanitizeNodes(nodes: Node[], context: Context): Node[] {
  return nodes.map((node, index) => {
    const path = [...context.path, 'children', index];
    if (node.type === 'frame' && node.children !== undefined) {
      return { ...node, children: sanitizeNodes(node.children, { ...context, path }) };
    }
    if (node.type !== 'svg') return node;
    try {
      return { ...node, svg: sanitizeSvg(node.svg) };
    } catch (error) {
      if (!(error instanceof SvgError)) throw error;
      context.diagnostics.push({
        severity: 'warning',
        code: 'schema',
        message: `SVG "${node.id}" can't be drawn: ${error.message.replace(/\.$/, '')}`,
        path: [...path, 'svg'],
        pageId: context.pageId,
        artboardId: context.artboardId,
        nodeId: node.id,
      });
      return { ...node, svg: '' };
    }
  });
}
