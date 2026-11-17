import { describe, expect, it } from 'vitest';
import { shortcutCommand, type KeyPress } from './shortcuts';

const none: KeyPress = {
  key: '',
  code: '',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
};

describe('shortcutCommand', () => {
  it.each([
    [{ key: '\\', metaKey: true }, 'toggle-sidebar'],
    [{ key: '=', metaKey: true }, 'zoom-in'],
    [{ key: '+', metaKey: true, shiftKey: true }, 'zoom-in'],
    [{ key: '-', ctrlKey: true }, 'zoom-out'],
    [{ key: '0', metaKey: true }, 'zoom-reset'],
    [{ key: '!', code: 'Digit1', shiftKey: true }, 'zoom-fit'],
    [{ key: '@', code: 'Digit2', shiftKey: true }, 'zoom-layer'],
  ] as const)('maps %j to %s', (press, command) => {
    expect(shortcutCommand({ ...none, ...press })).toBe(command);
  });

  it.each([
    [{ key: '1', code: 'Digit1' }],
    [{ key: '2', code: 'Digit2' }],
    [{ key: '=', metaKey: true, altKey: true }],
    [{ key: '!', code: 'Digit1', shiftKey: true, metaKey: true }],
    [{ key: 'n', metaKey: true }],
  ])('ignores %j', (press) => {
    expect(shortcutCommand({ ...none, ...press })).toBeNull();
  });
});
