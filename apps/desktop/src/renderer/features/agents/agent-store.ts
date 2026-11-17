import { create } from 'zustand';
import type { CursorTarget } from './cursor-geometry';

export interface AgentPresence {
  session: string;
  agent: string;
  summary: string;
  artboardId: string | null;
  target: CursorTarget | null;
  leaving: boolean;
}

interface AgentStore {
  agents: Record<string, AgentPresence>;
  latest: string | null;
}

export const useAgentStore = create<AgentStore>()(() => ({ agents: {}, latest: null }));

export function useLatestAgent(): AgentPresence | null {
  return useAgentStore((store) =>
    store.latest === null ? null : (store.agents[store.latest] ?? null),
  );
}

export function useAgentOn(artboardId: string): string | null {
  return useAgentStore(
    (store) =>
      Object.values(store.agents).find(
        (presence) => presence.artboardId === artboardId && !presence.leaving,
      )?.agent ?? null,
  );
}
