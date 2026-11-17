import type { DocumentState } from '../../shared/contract';
import { useClassWarnings, useCompiledDesign } from '../design/use-compiled-design';
import { Canvas } from '../features/canvas/Canvas';
import { pageIn } from '../features/canvas/current-page';
import { EmptyDesignHint } from '../features/canvas/EmptyDesignHint';
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
  const pageId = useViewStore((store) => store.pageId);
  const diagnostics =
    state.status === 'ok' ? [...state.diagnostics, ...classWarnings] : state.diagnostics;
  const shownPage = pageIn(compiled?.document ?? null, pageId);
  const isEmpty = state.document?.pages.every((page) =>
    page.artboards.every((artboard) => artboard.children.length === 0),
  );

  return (
    <WindowFrame
      title={
        <DocumentTitle name={state.name} pageName={pageIn(state.document, pageId)?.name}>
          <SaveStatus state={state} diagnostics={diagnostics} />
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
            overlay={(viewport) =>
              isEmpty === true && (
                <EmptyDesignHint
                  artboard={shownPage?.artboards[0]}
                  viewport={viewport}
                  path={state.path}
                  displayPath={state.displayPath}
                />
              )
            }
          />
          {state.status === 'invalid' && (
            <ErrorStrip diagnostics={diagnostics} document={state.document} />
          )}
        </>
      )}
    </WindowFrame>
  );
}
