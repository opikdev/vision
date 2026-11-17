import { useDocumentStore } from '../stores/document-store';
import { DesignWindow } from './DesignWindow';
import { StartWindow } from './StartWindow';
import { useAppEvents } from './use-app-events';

export function App() {
  useAppEvents();
  const loaded = useDocumentStore((store) => store.loaded);
  const state = useDocumentStore((store) => store.state);
  if (!loaded) return null;
  return state === null ? <StartWindow /> : <DesignWindow state={state} />;
}
