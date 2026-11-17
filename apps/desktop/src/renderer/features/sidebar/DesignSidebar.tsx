import { Cursor02Icon, FrameIcon, Note01Icon } from '@hugeicons/core-free-icons';
import type { Artboard, Diagnostic, VisionDocument } from '@vision/format';
import { SidebarMenu } from '@/components/ui/sidebar';
import { useViewStore } from '../../stores/view-store';
import { Icon } from '../../ui/Icon';
import { useAgentOn } from '../agents/agent-store';
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
        <SidebarMenu>
          {document.pages.map((candidate) => (
            <SidebarRow
              key={candidate.id}
              icon={<Icon icon={Note01Icon} className="shrink-0 text-muted-foreground" />}
              label={candidate.name}
              current={candidate.id === page?.id}
              onClick={() => {
                selectPage(candidate.id);
              }}
            />
          ))}
        </SidebarMenu>
      </SidebarSection>
      <SidebarSection title="Artboards">
        {page?.artboards.length === 0 && (
          <p className="px-2 text-xs text-muted-foreground">This page has no artboards yet.</p>
        )}
        <SidebarMenu>
          {page?.artboards.map((artboard) => (
            <SidebarRow
              key={artboard.id}
              icon={<Icon icon={FrameIcon} className="shrink-0 text-muted-foreground" />}
              label={artboard.name}
              trailing={<ArtboardMeta artboard={artboard} errors={errors.get(artboard.id) ?? 0} />}
              onClick={() => {
                zoomToBounds(artboard);
              }}
            />
          ))}
        </SidebarMenu>
      </SidebarSection>
    </>
  );
}

function ArtboardMeta({ artboard, errors }: { artboard: Artboard; errors: number }) {
  const agent = useAgentOn(artboard.id);
  if (errors > 0) {
    return (
      <span className="shrink-0 text-destructive tabular-nums">{plural(errors, 'error')}</span>
    );
  }
  if (agent !== null) {
    return (
      <span className="flex min-w-0 shrink items-center gap-1 text-muted-foreground">
        <Icon icon={Cursor02Icon} size={12} className="shrink-0" />
        <span className="truncate">{agent}</span>
      </span>
    );
  }
  return (
    <span className="shrink-0 text-muted-foreground tabular-nums">
      {artboard.width}×{artboard.height}
    </span>
  );
}
