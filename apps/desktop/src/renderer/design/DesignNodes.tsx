import type { Node } from '@vision/format';
import { useLayoutEffect, useRef } from 'react';
import { assetUrl } from './asset-url';

interface Assets {
  assetToken: string;
  assetsVersion: number;
}

export function DesignNodes({ nodes, ...assets }: { nodes: Node[] } & Assets) {
  return nodes.map((node) => <DesignNode key={node.id} node={node} {...assets} />);
}

function DesignNode({ node, ...assets }: { node: Node } & Assets) {
  switch (node.type) {
    case 'frame':
      return (
        <div className={node.class} data-node-id={node.id}>
          {node.children && <DesignNodes nodes={node.children} {...assets} />}
        </div>
      );
    case 'text':
      return (
        <p className={node.class} data-node-id={node.id}>
          {node.text}
        </p>
      );
    case 'image':
      return (
        <img
          className={node.class}
          data-node-id={node.id}
          src={assetUrl(node.src, assets.assetToken, assets.assetsVersion)}
          alt={node.alt ?? ''}
        />
      );
    case 'svg':
      return <SvgMarkup id={node.id} className={node.class} markup={node.svg} />;
  }
}

function SvgMarkup({
  id,
  className,
  markup,
}: {
  id: string;
  className: string | undefined;
  markup: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const svg = ref.current;
    if (svg === null) return;
    const template = svg.ownerDocument.createElement('template');
    template.innerHTML = markup;
    const source = template.content.firstElementChild;
    for (const name of svg.getAttributeNames()) {
      if (name !== 'class' && name !== 'data-node-id') svg.removeAttribute(name);
    }
    for (const attribute of source?.attributes ?? []) {
      if (attribute.name !== 'class' && attribute.name !== 'data-node-id') {
        svg.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
      }
    }
    svg.replaceChildren(...(source?.childNodes ?? []));
  }, [markup]);
  return <svg ref={ref} className={className} data-node-id={id} />;
}
