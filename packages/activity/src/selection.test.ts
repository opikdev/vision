import { describe, expect, it } from 'vitest';
import {
  encodeLine,
  parseSelectionRequest,
  parseSelectionResponse,
  type SelectionResponse,
} from './selection';

const id = '0b6e1c2a-4f7d-4c51-9d0e-3a8b2f6c1d90';

describe('selection requests and responses', () => {
  it('round-trip as one line each', () => {
    const request = { v: 1, id, request: 'selection', file: '/Users/ada/shop.vis' } as const;
    const response: SelectionResponse = {
      v: 1,
      id,
      response: { status: 'open', selection: { pageId: 'checkout', nodeIds: ['cart-continue'] } },
    };
    expect(encodeLine(request)).toBe(`${JSON.stringify(request)}\n`);
    expect(parseSelectionRequest(encodeLine(request) ?? '')).toEqual(request);
    expect(parseSelectionResponse(encodeLine(response) ?? '')).toEqual(response);
    const notOpen = { v: 1, id, response: { status: 'not-open' } } as const;
    expect(parseSelectionResponse(JSON.stringify(notOpen))).toEqual(notOpen);
  });

  it.each([
    ['not json', '{'],
    ['another version', JSON.stringify({ v: 2, id, request: 'selection', file: '/a.vis' })],
    [
      'an id that is not a uuid',
      JSON.stringify({ v: 1, id: 'x', request: 'selection', file: '/a.vis' }),
    ],
    ['another request', JSON.stringify({ v: 1, id, request: 'file', file: '/a.vis' })],
    ['an empty file', JSON.stringify({ v: 1, id, request: 'selection', file: '' })],
    [
      'an activity message',
      JSON.stringify({
        v: 1,
        session: id,
        agent: 'A',
        file: '/a.vis',
        at: 1,
        activity: { kind: 'done' },
      }),
    ],
  ])('ignores a request with %s', (_case, line) => {
    expect(parseSelectionRequest(line)).toBeUndefined();
  });

  it('rejects a response with too many nodes or an unknown status', () => {
    const many = Array.from({ length: 501 }, (_, index) => `n${index}`);
    const tooMany = {
      v: 1,
      id,
      response: { status: 'open', selection: { pageId: null, nodeIds: many } },
    };
    expect(parseSelectionResponse(JSON.stringify(tooMany))).toBeUndefined();
    expect(
      parseSelectionResponse(JSON.stringify({ v: 1, id, response: { status: 'busy' } })),
    ).toBeUndefined();
  });
});
