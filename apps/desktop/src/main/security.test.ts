import { describe, expect, it, vi } from 'vitest';
import { contentSecurityPolicy } from './security';

vi.mock('electron', () => ({ app: { isPackaged: true } }));

describe('contentSecurityPolicy', () => {
  it('allows only bundled code, inline styles and images from assets, https and data', () => {
    expect(contentSecurityPolicy(undefined)).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' vision-asset: https: data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
  });

  it('adds the dev server and its socket in development', () => {
    expect(contentSecurityPolicy('http://localhost:5173')).toBe(
      "default-src 'self' http://localhost:5173; script-src 'self' 'unsafe-inline' http://localhost:5173; style-src 'self' 'unsafe-inline'; img-src 'self' vision-asset: https: data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src 'self' http://localhost:5173 ws://localhost:*",
    );
  });
});
