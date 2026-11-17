// @vitest-environment happy-dom
import { act, StrictMode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../test/render';
import { Dialog } from './Dialog';

function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </button>
      {open && (
        <Dialog
          title="Connect an AI"
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        >
          <p>Body</p>
        </Dialog>
      )}
    </>
  );
}

async function openDialog(onClose = vi.fn()) {
  const container = await render(
    <StrictMode>
      <Harness onClose={onClose} />
    </StrictMode>,
  );
  const opener = container.querySelector('button');
  opener?.focus();
  await act(async () => {
    opener?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { container, opener, onClose };
}

describe('Dialog', () => {
  it('stays open as a modal under StrictMode', async () => {
    const { container, onClose } = await openDialog();
    expect(container.querySelector('dialog')?.open).toBe(true);
    expect(container.querySelector('dialog')?.getAttribute('aria-labelledby')).toBe(
      container.querySelector('h2')?.id,
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the close button and returns focus to the opener', async () => {
    const { container, opener, onClose } = await openDialog();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Close"]')?.click();
      await Promise.resolve();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(container.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes when the backdrop is clicked', async () => {
    const { container, onClose } = await openDialog();
    await act(async () => {
      container.querySelector('dialog')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
