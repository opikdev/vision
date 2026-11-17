import { useEffect, useRef, useState } from 'react';
import { reportError, vision } from '../bridge';

export function useCopy(): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );
  return {
    copied,
    copy: (text) => {
      vision
        .writeClipboard(text)
        .then(() => {
          setCopied(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => {
            setCopied(false);
          }, 1500);
        })
        .catch(reportError);
    },
  };
}
