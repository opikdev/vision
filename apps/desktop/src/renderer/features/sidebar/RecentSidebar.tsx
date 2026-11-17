import { Cancel01Icon, Note01Icon } from '@hugeicons/core-free-icons';
import { reportError, vision } from '../../bridge';
import { useRecentStore } from '../../stores/recent-store';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/IconButton';
import { SidebarRow, SidebarSection } from './SidebarSection';

export function RecentSidebar() {
  const files = useRecentStore((store) => store.files);
  return (
    <SidebarSection title="Recent">
      {files.length === 0 && (
        <p className="px-2 text-sm text-ink-subtle">Designs you create or open show up here.</p>
      )}
      {files.map((file) =>
        file.exists ? (
          <SidebarRow
            key={file.path}
            icon={<Icon icon={Note01Icon} className="shrink-0 text-ink-subtle" />}
            label={file.name}
            onClick={() => {
              vision.openPath(file.path).catch(reportError);
            }}
          />
        ) : (
          <div
            key={file.path}
            className="flex h-8 items-center gap-2.5 rounded-md pr-0.5 pl-2 text-ink-subtle"
          >
            <Icon icon={Note01Icon} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate line-through">{file.name}</span>
            <span className="shrink-0 text-sm">Missing</span>
            <IconButton
              icon={Cancel01Icon}
              label={`Remove ${file.name} from Recent`}
              tooltipAlign="end"
              onClick={() => {
                vision.removeRecent(file.path).catch(reportError);
              }}
            />
          </div>
        ),
      )}
    </SidebarSection>
  );
}
