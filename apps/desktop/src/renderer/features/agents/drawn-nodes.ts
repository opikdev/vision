export function drawnNode(artboardId: string, id: string): Element | null {
  const frame = document.querySelector<HTMLIFrameElement>(
    `iframe[data-artboard-id="${CSS.escape(artboardId)}"]`,
  );
  return frame?.contentDocument?.querySelector(`[data-node-id="${CSS.escape(id)}"]`) ?? null;
}
