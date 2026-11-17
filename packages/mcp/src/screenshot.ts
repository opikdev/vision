import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface VisionApp {
  command: string;
  args: string[];
}

export interface Runtime {
  env: NodeJS.ProcessEnv;
  execPath: string;
  electron: string | undefined;
  platform: NodeJS.Platform;
  exists: (path: string) => boolean;
}

export interface ScreenshotOptions {
  file: string;
  artboard: string;
  scale: 1 | 2;
}

export class ScreenshotError extends Error {
  override name = 'ScreenshotError';
}

export const macAppPath = '/Applications/Vision.app/Contents/MacOS/Vision';
const timeoutSeconds = 30;

export function currentRuntime(): Runtime {
  return {
    env: process.env,
    execPath: process.execPath,
    electron: process.versions.electron,
    platform: process.platform,
    exists: existsSync,
  };
}

export function resolveApp(runtime: Runtime): VisionApp | undefined {
  const { VISION_APP, VISION_APP_ENTRY, ELECTRON_RUN_AS_NODE } = runtime.env;
  if (VISION_APP) return { command: VISION_APP, args: VISION_APP_ENTRY ? [VISION_APP_ENTRY] : [] };
  if (ELECTRON_RUN_AS_NODE === '1' && runtime.electron !== undefined) {
    return { command: runtime.execPath, args: [] };
  }
  if (runtime.platform === 'darwin' && runtime.exists(macAppPath)) {
    return { command: macAppPath, args: [] };
  }
  return undefined;
}

export async function takeScreenshot(app: VisionApp, options: ScreenshotOptions): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), 'vision-screenshot-'));
  try {
    const out = join(dir, 'screenshot.png');
    await run(app.command, [
      ...app.args,
      '--vision-screenshot',
      options.file,
      '--artboard',
      options.artboard,
      '--out',
      out,
      '--scale',
      String(options.scale),
    ]);
    return await readPng(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function run(command: string, args: string[]): Promise<void> {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: timeoutSeconds * 1000,
      killSignal: 'SIGKILL',
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      reject(new ScreenshotError(`Couldn't start Vision at ${command}: ${error.message}`));
    });
    child.on('close', (code, signal) => {
      if (code === 0) resolve();
      else if (signal !== null) {
        reject(
          new ScreenshotError(`Vision didn't finish within ${timeoutSeconds} s and was stopped.`),
        );
      } else {
        const output = stderr.trim() || 'It printed no error.';
        reject(
          new ScreenshotError(`Vision couldn't take the screenshot (exit code ${code}): ${output}`),
        );
      }
    });
  });
}

async function readPng(path: string): Promise<Buffer> {
  try {
    return await readFile(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new ScreenshotError('Vision exited without writing the PNG.', { cause: error });
    }
    throw error;
  }
}
