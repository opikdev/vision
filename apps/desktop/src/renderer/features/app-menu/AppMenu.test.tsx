// @vitest-environment happy-dom
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecentStore } from '../../stores/recent-store';
import { useViewStore } from '../../stores/view-store';
import { render } from '../../test/render';
import { AppMenu } from './AppMenu';

const vision = vi.hoisted(() => ({
  runCommand: vi.fn(() => Promise.resolve()),
  openPath: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../bridge', () => ({ vision, reportError: vi.fn() }));

async function openMenu() {
  await render(<AppMenu />);
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Vision menu"]');
  if (trigger === null) throw new Error('No trigger');
  await act(async () => {
    trigger.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return trigger;
}

function item(name: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((element) =>
    element.textContent.startsWith(name),
  );
  if (found === undefined) throw new Error(`No menu item "${name}"`);
  return found;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('AppMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    useViewStore.setState({ dialog: null });
    useRecentStore.setState({
      files: [
        { path: '/designs/Moodboard.vis', name: 'Moodboard.vis', exists: true },
        { path: '/designs/Gone.vis', name: 'Gone.vis', exists: false },
      ],
    });
  });

  it('runs the chosen command', async () => {
    await openMenu();
    await click(item('New design…'));
    expect(vision.runCommand).toHaveBeenCalledWith('new-design');
  });

  it('disables the file commands while no design is open', async () => {
    await openMenu();
    expect(item('Show in Finder').getAttribute('aria-disabled')).toBe('true');
    expect(item('Copy file path').getAttribute('aria-disabled')).toBe('true');
    expect(item('Open…').getAttribute('aria-disabled')).toBeNull();
  });

  it('opens the Connect an AI dialog', async () => {
    await openMenu();
    await click(item('Connect an AI…'));
    expect(useViewStore.getState().dialog).toBe('connect-ai');
  });

  it('lists only recent designs that still exist and opens one', async () => {
    await openMenu();
    await click(item('Open recent'));
    expect(() => item('Gone.vis')).toThrow();
    await click(item('Moodboard.vis'));
    expect(vision.openPath).toHaveBeenCalledWith('/designs/Moodboard.vis');
  });

  it('says when there are no recent designs', async () => {
    useRecentStore.setState({ files: [] });
    await openMenu();
    await click(item('Open recent'));
    expect(item('No recent designs').getAttribute('aria-disabled')).toBe('true');
  });
});
