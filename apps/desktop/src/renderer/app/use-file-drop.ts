import { useRef, useState, type DragEvent } from 'react';
import { reportError, vision } from '../bridge';

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

export function useFileDrop() {
  const [dropActive, setDropActive] = useState(false);
  const depth = useRef(0);
  return {
    dropActive,
    dropHandlers: {
      onDragEnter: (event: DragEvent) => {
        if (!hasFiles(event)) return;
        depth.current += 1;
        setDropActive(true);
      },
      onDragLeave: (event: DragEvent) => {
        if (!hasFiles(event)) return;
        depth.current -= 1;
        if (depth.current === 0) setDropActive(false);
      },
      onDragOver: (event: DragEvent) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        depth.current = 0;
        setDropActive(false);
        for (const file of Array.from(event.dataTransfer.files)) {
          const path = vision.getPathForFile(file);
          if (path.toLowerCase().endsWith('.vis')) vision.openPath(path).catch(reportError);
        }
      },
    },
  };
}
