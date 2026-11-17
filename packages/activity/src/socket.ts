import { homedir } from 'node:os';
import { join } from 'node:path';

export function socketPath(env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string {
  const override = env.VISION_ACTIVITY_SOCKET;
  if (override !== undefined && override !== '') return override;
  return join(home, 'Library', 'Application Support', 'Vision', 'activity.sock');
}
