import { useEffect, useState } from 'react';
import { vision } from '../../bridge';
import { currentPage } from '../canvas/current-page';
import { useAgentStore } from './agent-store';
import { AgentTracker } from './agent-tracker';
import { pageLocator } from './drawn-nodes';

export function useAgentActivity(): AgentTracker {
  const [tracker] = useState(() => new AgentTracker(pageLocator(currentPage)));
  useEffect(() => {
    const unsubscribe = vision.onAgentActivity((activity) => {
      tracker.receive(activity);
    });
    return () => {
      unsubscribe();
      tracker.dispose();
      useAgentStore.setState({ agents: {}, latest: null });
    };
  }, [tracker]);
  return tracker;
}
