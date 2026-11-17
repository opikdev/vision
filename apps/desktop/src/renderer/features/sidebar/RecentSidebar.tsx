import { Cancel01Icon, Note01Icon } from '@hugeicons/core-free-icons';
import { SidebarMenu, SidebarMenuAction, SidebarMenuItem } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { reportError, vision } from '../../bridge';
import { useRecentStore } from '../../stores/recent-store';
import { Icon } from '@/components/Icon';
import { SidebarRow, SidebarSection } from './SidebarSection';

export function RecentSidebar() {
  const files = useRecentStore((store) => store.files);
  return (
    <SidebarSection title="Recent">
      {files.length === 0 && (
        <p className="px-2 text-xs text-muted-foreground">
          Designs you create or open show up here.
        </p>
      )}
      <SidebarMenu>
        {files.map((file) =>
          file.exists ? (
            <SidebarRow
              key={file.path}
              icon={<Icon icon={Note01Icon} className="text-muted-foreground" />}
              label={file.name}
              onClick={() => {
                vision.openPath(file.path).catch(reportError);
              }}
            />
          ) : (
            <SidebarMenuItem key={file.path}>
              <div className="flex h-8 items-center gap-2.5 rounded-md pr-10 pl-2 text-muted-foreground">
                <Icon icon={Note01Icon} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate line-through">{file.name}</span>
                <span className="shrink-0 text-xs">Missing</span>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <SidebarMenuAction
                      aria-label={`Remove ${file.name} from Recent`}
                      onClick={() => {
                        vision.removeRecent(file.path).catch(reportError);
                      }}
                    />
                  }
                >
                  <Icon icon={Cancel01Icon} />
                </TooltipTrigger>
                <TooltipContent>{`Remove ${file.name} from Recent`}</TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarSection>
  );
}
