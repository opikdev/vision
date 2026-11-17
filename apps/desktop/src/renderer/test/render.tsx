import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

export async function render(element: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
    await Promise.resolve();
  });
  return container;
}
