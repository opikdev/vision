import { useEffect, useState } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { McpServer } from '../../../shared/contract';
import { reportError, vision } from '../../bridge';
import { useDocumentStore } from '../../stores/document-store';
import { useViewStore } from '../../stores/view-store';
import { useCopy } from '@/hooks/use-copy';
import { claudeCodeSetup, codexSetup, jsonSetup, samplePrompt } from './setup';

export function ConnectAiDialog() {
  const open = useViewStore((store) => store.dialog === 'connect-ai');
  const close = useViewStore((store) => store.closeDialog);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="w-[560px]">
        <DialogHeader className="px-5 pt-4 pb-1">
          <DialogTitle>Connect an AI</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-5">
          <DialogDescription>
            Add Vision's MCP server to your AI tool once, then ask it to design in any .vis file
            while you watch it redraw here.
          </DialogDescription>
          <Setup />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Setup() {
  const path = useDocumentStore((store) => store.state?.path ?? null);
  const [server, setServer] = useState<McpServer | null>(null);
  useEffect(() => {
    vision.getMcpServer().then(setServer, reportError);
  }, []);
  if (server === null) return null;
  return (
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
        <h3 className="text-xs text-muted-foreground">{title}</h3>
        <Button
          size="sm"
          variant="ghost"
          aria-label={copyLabel}
          onClick={() => {
            copy(text);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre
        className={cn(
          'mt-1 max-h-48 overflow-auto rounded-md border border-border bg-background px-3 py-2 whitespace-pre-wrap select-text [overflow-wrap:anywhere]',
          prose ? 'font-sans' : 'font-mono text-xs tracking-normal',
        )}
      >
        {text}
      </pre>
    </section>
  );
}
