import type { DocumentState } from '../../shared/contract';
import { useClassWarnings, useCompiledDesign } from '../design/use-compiled-design';
import { useLatestAgent } from '../features/agents/agent-store';
import { AgentCursors } from '../features/agents/AgentCursors';
import { AgentStatus } from '../features/agents/AgentStatus';
import { useAgentActivity } from '../features/agents/use-agent-activity';
import { useReveal } from '../features/agents/use-reveal';
import { Canvas } from '../features/canvas/Canvas';
import { pageIn } from '../features/canvas/current-page';
import { EmptyDesignHint } from '../features/canvas/EmptyDesignHint';
import { useSyncLayers } from '../features/layers/layer-store';
import { LayerOverlays } from '../features/layers/LayerOverlays';
import { useLayerKeys } from '../features/layers/use-layer-keys';
import { BlockedState } from '../features/problems/BlockedState';
import { ErrorStrip } from '../features/problems/ErrorStrip';
import { SaveStatus } from '../features/problems/SaveStatus';
import { DesignSidebar } from '../features/sidebar/DesignSidebar';
import { DocumentTitle } from '../features/toolbar/DocumentTitle';
import { ZoomControls } from '../features/toolbar/ZoomControls';
import { useViewStore } from '../stores/view-store';
import { WindowFrame } from './WindowFrame';

export function DesignWindow({ state }: { state: DocumentState }) {
  const compiled = useCompiledDesign(state.document);
  const classWarnings = useClassWarnings(state.document);
  const tracker = useAgentActivity();
  useReveal(compiled?.document ?? null, tracker);
  const agentWorking = useLatestAgent() !== null;
  const pageId = useViewStore((store) => store.pageId);
  const diagnostics =
    state.status === 'ok' ? [...state.diagnostics, ...classWarnings] : state.diagnostics;
  const shownPage = pageIn(compiled?.document ?? null, pageId);
  useSyncLayers(pageIn(state.document, pageId));
  useLayerKeys();
  const isEmpty = state.document?.pages.every((page) =>
    page.artboards.every((artboard) => artboard.children.length === 0),
  );

  return (
    <WindowFrame
      title={
        <DocumentTitle name={state.name} pageName={pageIn(state.document, pageId)?.name}>
          <AgentStatus />
          <SaveStatus state={state} diagnostics={diagnostics} showUpdated={!agentWorking} />
        </DocumentTitle>
      }
      actions={<ZoomControls disabled={state.document === null} />}
      sidebar={
        state.document !== null && (
          <DesignSidebar document={state.document} diagnostics={diagnostics} />
        )
      }
    >
      {state.document === null ? (
        <BlockedState state={state} diagnostics={diagnostics} />
      ) : (
        <>
          <Canvas
            page={shownPage}
            css={compiled?.css ?? null}
            assetToken={state.assetToken}
            assetsVersion={state.assetsVersion}
            overlay={(viewport) => (
              <>
                {isEmpty === true && (
                  <EmptyDesignHint
                    artboard={shownPage?.artboards[0]}
                    viewport={viewport}
                    path={state.path}
                    displayPath={state.displayPath}
                  />
                )}
                {shownPage !== undefined && <LayerOverlays page={shownPage} viewport={viewport} />}
                <AgentCursors page={shownPage} viewport={viewport} />
              </>
            )}
          />
          {state.status === 'invalid' && (
            <ErrorStrip diagnostics={diagnostics} document={state.document} />
          )}
        </>
      )}
    </WindowFrame>
  );
}
