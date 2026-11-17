import type { Artboard } from '@vision/format';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DesignNodes } from './DesignNodes';
import { frameBaseCss } from './tailwind-engine';

export function ArtboardFrame({
  artboard,
  css,
  assetToken,
  assetsVersion,
  onRendered,
}: {
  artboard: Artboard;
  css: string;
  assetToken: string;
  assetsVersion: number;
  onRendered?: (document: Document) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (iframe === null) return;
    const setUp = () => {
      const doc = iframe.contentDocument;
      if (!doc || doc.body === styleRef.current?.ownerDocument.body) return;
      doc.documentElement.dataset.theme = 'light';
      const style = doc.createElement('style');
      doc.head.append(style);
      styleRef.current = style;
      setBody(doc.body);
    };
    setUp();
    iframe.addEventListener('load', setUp);
    return () => {
      iframe.removeEventListener('load', setUp);
    };
  }, []);

  useLayoutEffect(() => {
    if (styleRef.current !== null) styleRef.current.textContent = `${css}\n${frameBaseCss}`;
  }, [body, css]);

  useEffect(() => {
    if (body !== null) onRendered?.(body.ownerDocument);
  }, [body, css, artboard, onRendered]);

  return (
    <>
      <iframe
        ref={iframeRef}
        title={artboard.name}
        data-artboard-id={artboard.id}
        sandbox="allow-same-origin"
        tabIndex={-1}
        width={artboard.width}
        height={artboard.height}
        className="pointer-events-none block border-0 bg-transparent"
      />
      {body !== null &&
        createPortal(
          <div data-artboard="" className={artboard.class}>
            <DesignNodes
              nodes={artboard.children}
              assetToken={assetToken}
              assetsVersion={assetsVersion}
            />
          </div>,
          body,
        )}
    </>
  );
}
