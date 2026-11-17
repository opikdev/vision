import { useEffect } from 'react';
import type { RecentFile } from '../../shared/contract';
import { reportError, vision } from '../bridge';
import { useDocumentStore } from '../stores/document-store';
import { useRecentStore } from '../stores/recent-store';
import { useViewStore } from '../stores/view-store';
import { shortcutCommand } from './shortcuts';
import { runViewCommand } from './view-commands';

export function useAppEvents(): void {
  useEffect(() => {
    const { receive } = useDocumentStore.getState();
    const setRecent = (files: RecentFile[]) => {
      useRecentStore.setState({ files });
    };
    const unsubscribers = [
      vision.onState(receive),
      vision.onRecentChanged(setRecent),
      vision.onViewCommand(runViewCommand),
    ];
    vision.getState().then(receive, reportError);
    vision.listRecent().then(setRecent, reportError);
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || useViewStore.getState().dialog !== null) return;
      const command = shortcutCommand(event);
      if (command === null) return;
      event.preventDefault();
      runViewCommand(command);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
