import { describe, expect, it } from 'vitest';
import { encodeActivity, parseActivity, type ActivityMessage } from './message';

const edit: ActivityMessage = {
  v: 1,
  session: '0b6e1c2a-4f7d-4c51-9d0e-3a8b2f6c1d90',
  agent: 'Claude Code',
  file: '/Users/ada/shop.vis',
  at: 1_763_380_000_000,
  activity: {
    kind: 'edit',
    artboard: 'cart',
    nodes: ['title', 'price'],
    summary: 'is adding 2 elements to Cart',
  },
};

describe('encodeActivity and parseActivity', () => {
  it('round-trips a message as one line', () => {
    const line = encodeActivity(edit);
    expect(line).toBe(`${JSON.stringify(edit)}\n`);
    expect(parseActivity(line ?? '')).toEqual(edit);
  });

  it('refuses to encode a line over 64 KB', () => {
    const big = {
      ...edit,
      activity: { ...edit.activity, nodes: Array(500).fill('n'.repeat(200)) },
    };
    expect(encodeActivity(big as ActivityMessage)).toBeUndefined();
  });

  it.each([
    ['not json', '{'],
    ['another version', JSON.stringify({ ...edit, v: 2 })],
    ['a session that is not a uuid', JSON.stringify({ ...edit, session: 'abc' })],
    ['an unknown kind', JSON.stringify({ ...edit, activity: { kind: 'dance' } })],
    [
      'too many nodes',
      JSON.stringify({ ...edit, activity: { ...edit.activity, nodes: Array(501).fill('a') } }),
    ],
    ['an empty agent', JSON.stringify({ ...edit, agent: '' })],
  ])('ignores %s', (_case, line) => {
    expect(parseActivity(line)).toBeUndefined();
  });

  it('accepts done and look messages', () => {
    const done = { ...edit, activity: { kind: 'done' } };
    const look = { ...edit, activity: { kind: 'look', summary: 'is reading the design' } };
    expect(parseActivity(JSON.stringify(done))).toEqual(done);
    expect(parseActivity(JSON.stringify(look))).toEqual(look);
  });
});
