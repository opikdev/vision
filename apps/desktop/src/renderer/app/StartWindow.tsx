import { RecentSidebar } from '../features/sidebar/RecentSidebar';
import { StartPanel } from '../features/start/StartPanel';
import { WindowFrame } from './WindowFrame';

export function StartWindow() {
  return (
    <WindowFrame
      title={<h1 className="text-ink-subtle">No design open</h1>}
      sidebar={<RecentSidebar />}
    >
      <StartPanel />
    </WindowFrame>
  );
}
