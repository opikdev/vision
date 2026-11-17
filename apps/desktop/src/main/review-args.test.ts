import { describe, expect, it } from 'vitest';
import { parseReviewArgs } from './review-args';

const base = ['/Vision', '--vision-review=/d/a.vis', '--out=/tmp/review.json'];

describe('parseReviewArgs', () => {
  it('ignores normal launches and screenshots', () => {
    expect(parseReviewArgs(['/Vision', '/d/a.vis'])).toEqual({ kind: 'none' });
    expect(
      parseReviewArgs(['/Vision', '--vision-screenshot=/d/a.vis', '--out=/tmp/a.png']),
    ).toEqual({ kind: 'none' });
  });

  it('reviews every artboard unless one is named', () => {
    expect(parseReviewArgs(base)).toEqual({
      kind: 'request',
      request: { file: '/d/a.vis', out: '/tmp/review.json' },
    });
    expect(
      parseReviewArgs(['/Electron', 'apps/desktop', ...base.slice(1), '--artboard=cart']),
    ).toEqual({
      kind: 'request',
      request: { file: '/d/a.vis', out: '/tmp/review.json', artboard: 'cart' },
    });
  });

  it('keeps values that look like switches inside their own argument', () => {
    expect(parseReviewArgs([...base, '--artboard=-no-sandbox'])).toMatchObject({
      request: { artboard: '-no-sandbox' },
    });
  });

  it.each([
    [
      ['/Vision', '--vision-review', '--out=/tmp/r.json'],
      'Missing --vision-review=<absolute .vis path>',
    ],
    [
      ['/Vision', '--vision-review=a.vis', '--out=/tmp/r.json'],
      '--vision-review needs an absolute .vis path, got "a.vis"',
    ],
    [['/Vision', '--vision-review=/d/a.vis'], 'Missing --out=<absolute .json path>'],
    [
      ['/Vision', '--vision-review=/d/a.vis', '--out=/tmp/r.png'],
      '--out needs an absolute .json path, got "/tmp/r.png"',
    ],
    [[...base, '--artboard='], '--artboard needs an id'],
  ])('rejects %j', (argv, message) => {
    expect(parseReviewArgs(argv)).toEqual({ kind: 'invalid', message });
  });
});
