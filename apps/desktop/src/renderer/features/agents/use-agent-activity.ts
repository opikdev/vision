import { useEffect, useState } from 'react';
import { vision } from '../../bridge';
import { currentPage } from '../canvas/current-page';
import { AgentPlayback } from './agent-playback';
import { useAgentStore } from './agent-store';
import { AgentTracker } from './agent-tracker';
import { drawnStage } from './drawn-stage';
import { pageLocator } from './page-locator';

export function useAgentActivity(): AgentPlayback {
  const [{ tracker, playback }] = useState(() => {
    const tracker = new AgentTracker(pageLocator(currentPage));
    return { tracker, playback: new AgentPlayback(tracker, drawnStage) };
  });
  useEffect(() => {
    const unsubscribe = vision.onAgentActivity((activity) => {
      playback.receive(activity);
      tracker.receive(activity);
    });
    return () => {
      unsubscribe();
      tracker.dispose();
      useAgentStore.setState({ agents: {}, latest: null });
    };
  }, [tracker, playback]);
  return playback;
}
