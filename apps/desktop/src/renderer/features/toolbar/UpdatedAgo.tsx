import { useEffect, useState } from 'react';
import { relativeTime } from './relative-time';

export function UpdatedAgo({ mtimeMs }: { mtimeMs: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return (
    <span className="shrink-0 text-ink-subtle tabular-nums">
      Updated {relativeTime(mtimeMs, now)}
    </span>
  );
}
