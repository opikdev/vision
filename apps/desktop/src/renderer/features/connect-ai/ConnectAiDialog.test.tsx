// @vitest-environment happy-dom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewStore } from '../../stores/view-store';
import { cleanup, render } from '../../test/render';
import { ConnectAiDialog } from './ConnectAiDialog';

vi.mock('../../bridge', () => ({
  vision: {
    getMcpServer: () =>
      Promise.resolve({ command: '/Applications/Vision.app/vision', args: ['mcp'], env: {} }),
    writeClipboard: () => Promise.resolve(),
  },
  reportError: vi.fn(),
}));

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('ConnectAiDialog', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useViewStore.setState({ dialog: null });
  });

  it('shows nothing until it is opened', async () => {
    await render(<ConnectAiDialog />);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens as a titled dialog with the setup command', async () => {
    await render(<ConnectAiDialog />);
    act(() => {
      useViewStore.getState().openDialog('connect-ai');
    });
    await settle();
    const dialog = document.querySelector('[role="dialog"]');
    const title = dialog?.querySelector('h2');
    expect(title?.textContent).toBe('Connect an AI');
    expect(dialog?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(dialog?.querySelector('pre')?.textContent).toBe(
      'claude mcp add --scope user vision -- /Applications/Vision.app/vision mcp',
    );
  });

  it('closes from the close button', async () => {
    await render(<ConnectAiDialog />);
    act(() => {
      useViewStore.getState().openDialog('connect-ai');
    });
    await settle();
    await act(async () => {
      document.querySelector<HTMLButtonElement>('button[aria-label="Close"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(useViewStore.getState().dialog).toBeNull();
  });
});
