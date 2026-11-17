import type { ViewCommand } from '../../shared/contract';

export interface KeyPress {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export function shortcutCommand(press: KeyPress): ViewCommand | null {
  if (press.altKey) return null;
  const command = press.metaKey || press.ctrlKey;
  if (!command) return press.shiftKey && press.code === 'Digit1' ? 'zoom-fit' : null;
  if (press.key === '\\') return 'toggle-sidebar';
  if (press.key === '=' || press.key === '+') return 'zoom-in';
  if (press.key === '-') return 'zoom-out';
  if (press.key === '0' && !press.shiftKey) return 'zoom-reset';
  return null;
}
