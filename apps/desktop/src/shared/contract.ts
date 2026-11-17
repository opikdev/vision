import type { ActivityMessage, Selection } from '@vision/activity';
import type { Diagnostic, VisionDocument } from '@vision/format';

export const appCommands = ['new-design', 'open', 'show-in-finder', 'copy-path', 'quit'] as const;
export type AppCommand = (typeof appCommands)[number];

export type ViewCommand =
  | 'toggle-sidebar'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-reset'
  | 'zoom-fit'
  | 'zoom-layer'
  | 'connect-ai';

export type DocumentStatus = 'ok' | 'invalid' | 'missing' | 'read-error';

export interface DocumentState {
  revision: number;
  path: string;
  displayPath: string;
  name: string;
  status: DocumentStatus;
  document: VisionDocument | null;
  diagnostics: Diagnostic[];
  readError: string | null;
  mtimeMs: number | null;
  assetToken: string;
  assetsVersion: number;
}

export interface RecentFile {
  path: string;
  name: string;
  exists: boolean;
}

export interface McpServer {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export type AgentActivity = Pick<ActivityMessage, 'session' | 'agent' | 'activity'>;

export interface VisionApi {
  getState(): Promise<DocumentState | null>;
  onState(listener: (state: DocumentState | null) => void): () => void;
  listRecent(): Promise<RecentFile[]>;
  onRecentChanged(listener: (files: RecentFile[]) => void): () => void;
  removeRecent(path: string): Promise<void>;
  openPath(path: string): Promise<void>;
  runCommand(command: AppCommand): Promise<void>;
  onViewCommand(listener: (command: ViewCommand) => void): () => void;
  writeClipboard(text: string): Promise<void>;
  getMcpServer(): Promise<McpServer>;
  captureReady(): Promise<void>;
  captureFailed(message: string): Promise<void>;
  onAgentActivity(listener: (activity: AgentActivity) => void): () => void;
  setSelection(selection: Selection): Promise<void>;
  getPathForFile(file: File): string;
}
