import { TooltipProvider } from '@/components/ui/tooltip';
import { captureParamsSchema } from '../../shared/schemas';
import { useDocumentStore } from '../stores/document-store';
import { CaptureView } from './CaptureView';
import { DesignWindow } from './DesignWindow';
import { StartWindow } from './StartWindow';
import { useAppEvents } from './use-app-events';

const capture = captureParamsSchema.safeParse(
  Object.fromEntries(new URLSearchParams(window.location.search)),
);

export function App() {
  return capture.success ? <CaptureView artboardId={capture.data.artboard} /> : <AppWindow />;
}

function AppWindow() {
  useAppEvents();
  const loaded = useDocumentStore((store) => store.loaded);
  const state = useDocumentStore((store) => store.state);
  if (!loaded) return null;
  return (
    <TooltipProvider>
      {state === null ? <StartWindow /> : <DesignWindow state={state} />}
    </TooltipProvider>
  );
}
