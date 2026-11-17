import { FrameIcon, Note01Icon } from '@hugeicons/core-free-icons';
import type { Diagnostic, VisionDocument } from '@vision/format';
import { useViewStore } from '../../stores/view-store';
import { Icon } from '../../ui/Icon';
import { zoomToBounds } from '../canvas/canvas-commands';
import { pageIn } from '../canvas/current-page';
import { artboardErrorCounts, plural } from '../problems/problems';
import { SidebarRow, SidebarSection } from './SidebarSection';

export function DesignSidebar({
  document,
  diagnostics,
}: {
  document: VisionDocument;
  diagnostics: Diagnostic[];
}) {
  const pageId = useViewStore((store) => store.pageId);
  const selectPage = useViewStore((store) => store.selectPage);
  const page = pageIn(document, pageId);
  const errors = artboardErrorCounts(diagnostics);
  return (
    <>
      <SidebarSection title="Pages">
        {document.pages.map((candidate) => (
          <SidebarRow
            key={candidate.id}
            icon={<Icon icon={Note01Icon} className="shrink-0 text-ink-subtle" />}
            label={candidate.name}
            current={candidate.id === page?.id}
            onClick={() => {
              selectPage(candidate.id);
            }}
          />
        ))}
      </SidebarSection>
      <SidebarSection title="Artboards" className="mt-3">
        {page?.artboards.length === 0 && (
          <p className="px-2 text-sm text-ink-subtle">This page has no artboards yet.</p>
        )}
        {page?.artboards.map((artboard) => {
          const count = errors.get(artboard.id) ?? 0;
          return (
            <SidebarRow
              key={artboard.id}
              icon={<Icon icon={FrameIcon} className="shrink-0 text-ink-subtle" />}
              label={artboard.name}
              trailing={
                count > 0 ? (
                  <span className="shrink-0 text-red tabular-nums">{plural(count, 'error')}</span>
                ) : (
                  <span className="shrink-0 text-ink-subtle tabular-nums">
                    {artboard.width}×{artboard.height}
                  </span>
                )
              }
              onClick={() => {
                zoomToBounds(artboard);
              }}
            />
          );
        })}
      </SidebarSection>
    </>
  );
}
