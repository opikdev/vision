import { Cursor02Icon } from '@hugeicons/core-free-icons';
import { cn } from 'cn';
import { Icon } from '@/components/Icon';
import { useLatestAgent } from './agent-store';

export function AgentStatus() {
  const presence = useLatestAgent();
  return (
    <span
      role="status"
      className={cn(
        'flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-200',
        presence?.leaving === true && 'opacity-0',
      )}
    >
      {presence !== null && (
        <>
          <Icon icon={Cursor02Icon} size={14} className="shrink-0" />
          <span className="truncate">
            <span className="font-medium text-foreground">{presence.agent}</span> {presence.summary}
          </span>
        </>
      )}
    </span>
  );
}
