import { useEffect, useState } from 'react';
import type { McpServer } from '../../../shared/contract';
import { reportError, vision } from '../../bridge';
import { useDocumentStore } from '../../stores/document-store';
import { useViewStore } from '../../stores/view-store';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Dialog } from '../../ui/Dialog';
import { useCopy } from '../../ui/use-copy';
import { claudeCodeSetup, codexSetup, jsonSetup, samplePrompt } from './setup';

export function ConnectAiDialog() {
  const close = useViewStore((store) => store.closeDialog);
  const path = useDocumentStore((store) => store.state?.path ?? null);
  const [server, setServer] = useState<McpServer | null>(null);
  useEffect(() => {
    vision.getMcpServer().then(setServer, reportError);
  }, []);

  return (
    <Dialog title="Connect an AI" onClose={close}>
      <p className="text-ink-subtle">
        Add Vision's MCP server to your AI tool once, then ask it to design in any .vis file while
        you watch it redraw here.
      </p>
      {server !== null && (
        <div className="mt-4 flex flex-col gap-4">
          <Snippet
            title="Claude Code"
            copyLabel="Copy Claude Code command"
            text={claudeCodeSetup(server)}
          />
          <Snippet title="Codex CLI" copyLabel="Copy Codex CLI command" text={codexSetup(server)} />
          <Snippet
            title="Cursor, Claude Desktop and other tools"
            copyLabel="Copy JSON config"
            text={jsonSetup(server)}
          />
          <Snippet
            title="Then try a prompt like"
            copyLabel="Copy prompt"
            text={samplePrompt(path)}
            prose
          />
        </div>
      )}
    </Dialog>
  );
}

function Snippet({
  title,
  copyLabel,
  text,
  prose = false,
}: {
  title: string;
  copyLabel: string;
  text: string;
  prose?: boolean;
}) {
  const { copied, copy } = useCopy();
  return (
    <section>
      <div className="flex h-7 items-center justify-between">
        <h3 className="text-sm text-ink-subtle">{title}</h3>
        <Button
          size="sm"
          variant="quiet"
          aria-label={copyLabel}
          onClick={() => {
            copy(text);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre
        className={cx(
          'mt-1 max-h-48 overflow-auto rounded-md border border-line bg-bg px-3 py-2 whitespace-pre-wrap select-text [overflow-wrap:anywhere]',
          prose ? 'font-sans' : 'font-mono text-sm tracking-normal',
        )}
      >
        {text}
      </pre>
    </section>
  );
}
