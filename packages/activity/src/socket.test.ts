import { describe, expect, it } from 'vitest';
import { socketPath } from './socket';

describe('socketPath', () => {
  it('lives in Vision’s Application Support folder', () => {
    expect(socketPath({}, '/Users/ada')).toBe(
      '/Users/ada/Library/Application Support/Vision/activity.sock',
    );
  });

  it('uses VISION_ACTIVITY_SOCKET when it is set', () => {
    expect(socketPath({ VISION_ACTIVITY_SOCKET: '/tmp/a.sock' }, '/Users/ada')).toBe('/tmp/a.sock');
    expect(socketPath({ VISION_ACTIVITY_SOCKET: '' }, '/Users/ada')).toBe(
      '/Users/ada/Library/Application Support/Vision/activity.sock',
    );
  });
});
