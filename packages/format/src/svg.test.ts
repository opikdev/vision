import { describe, expect, it } from 'vitest';
import { sanitizeSvg, SvgError } from './svg';

describe('sanitizeSvg', () => {
  it('keeps a clean icon', () => {
    const icon =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16"></path></svg>';
    expect(sanitizeSvg(icon)).toBe(icon);
  });

  it('removes scripts, styles, foreignObject and event handlers', () => {
    const svg = `<svg onload="alert(1)" viewBox="0 0 1 1"><script>alert(2)</script><style>*{}</style><foreignObject><div>x</div></foreignObject><circle onclick="x()" r="1"/></svg>`;
    expect(sanitizeSvg(svg)).toBe('<svg viewBox="0 0 1 1"><circle r="1"></circle></svg>');
  });

  it('removes javascript: and external references but keeps local ones', () => {
    const svg = `<svg><a href="javascript:alert(1)"><text>x</text></a><a xlink:href="javascript:alert(1)"></a><image href="https://evil.test/x.png"/><use href="#shape"/><rect fill="url(#grad)"/><rect fill="url(https://evil.test/a)"/><set attributeName="href" to="javascript:alert(1)"/></svg>`;
    expect(sanitizeSvg(svg)).toBe(
      '<svg><a><text>x</text></a><a></a><image></image><use href="#shape"></use><rect fill="url(#grad)"></rect><rect></rect></svg>',
    );
  });

  it('allows surrounding whitespace and comments and is idempotent', () => {
    const once = sanitizeSvg('\n<!-- icon -->\n<svg viewBox="0 0 2 2"><path d="M0 0"/></svg>\n');
    expect(once).toBe('<svg viewBox="0 0 2 2"><path d="M0 0"></path></svg>');
    expect(sanitizeSvg(once)).toBe(once);
  });

  it.each([
    ['<div></div>', 'Expected a single <svg> element, got <div>.'],
    ['<svg></svg><svg></svg>', 'Expected a single <svg> element, got 2 top-level nodes.'],
    ['', 'Expected a single <svg> element, got nothing.'],
    ['hello', 'Expected a single <svg> element, got text.'],
  ])('rejects %j', (svg, message) => {
    expect(() => sanitizeSvg(svg)).toThrow(SvgError);
    expect(() => sanitizeSvg(svg)).toThrow(message);
  });
});
