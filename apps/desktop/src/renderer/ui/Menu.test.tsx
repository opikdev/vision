// @vitest-environment happy-dom
import { Settings01Icon } from '@hugeicons/core-free-icons';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../test/render';
import { MenuButton, type MenuEntry } from './Menu';

function entries(onSelect: (label: string) => void): MenuEntry[] {
  const item = (label: string, disabled = false): MenuEntry => ({
    type: 'item',
    label,
    disabled,
    onSelect: () => {
      onSelect(label);
    },
  });
  return [
    item('New design'),
    item('Show in Finder', true),
    { type: 'separator' },
    {
      type: 'submenu',
      label: 'Help',
      icon: Settings01Icon,
      entries: [item('Docs'), item('About')],
    },
    item('Quit'),
  ];
}

async function setUp() {
  const onSelect = vi.fn();
  const container = await render(
    <MenuButton label="Vision menu" entries={entries(onSelect)}>
      Menu
    </MenuButton>,
  );
  const trigger = container.querySelector('button');
  if (trigger === null) throw new Error('No trigger');
  trigger.focus();
  return { container, trigger, onSelect };
}

async function press(key: string) {
  await act(async () => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await Promise.resolve();
  });
}

const focused = () => document.activeElement?.textContent;

describe('MenuButton', () => {
  it('opens on ArrowDown with the first item focused and skips disabled items', async () => {
    const { trigger } = await setUp();
    await press('ArrowDown');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(focused()).toBe('New design');
    await press('ArrowDown');
    expect(focused()).toBe('Help');
    await press('ArrowDown');
    expect(focused()).toBe('Quit');
    await press('ArrowDown');
    expect(focused()).toBe('New design');
    await press('ArrowUp');
    expect(focused()).toBe('Quit');
    await press('Home');
    expect(focused()).toBe('New design');
    await press('End');
    expect(focused()).toBe('Quit');
  });

  it('opens on ArrowUp with the last item focused', async () => {
    await setUp();
    await press('ArrowUp');
    expect(focused()).toBe('Quit');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const { container, trigger } = await setUp();
    await press('ArrowDown');
    await press('Escape');
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('opens a submenu with ArrowRight and goes back with ArrowLeft', async () => {
    const { container } = await setUp();
    await press('ArrowDown');
    await press('ArrowDown');
    expect(focused()).toBe('Help');
    await press('ArrowRight');
    expect(container.querySelectorAll('[role="menu"]')).toHaveLength(2);
    expect(focused()).toBe('Docs');
    await press('ArrowDown');
    expect(focused()).toBe('About');
    await press('ArrowLeft');
    expect(container.querySelectorAll('[role="menu"]')).toHaveLength(1);
    expect(focused()).toBe('Help');
  });

  it('runs the chosen item and returns focus to the trigger', async () => {
    const { container, trigger, onSelect } = await setUp();
    await press('ArrowDown');
    await act(async () => {
      (document.activeElement as HTMLElement).click();
      await Promise.resolve();
    });
    expect(onSelect).toHaveBeenCalledWith('New design');
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes without moving focus on Tab', async () => {
    const { container } = await setUp();
    await press('ArrowDown');
    await press('Tab');
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });
});
