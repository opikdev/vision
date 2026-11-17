import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isMissingFileError } from '@vision/format/node';

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

export class VisionAppError extends Error {
  override name = 'VisionAppError';
}

export const macAppPath = '/Applications/Vision.app/Contents/MacOS/Vision';
const timeoutSeconds = 30;

export const appHint =
  'To use another build of Vision, set VISION_APP to its executable, and VISION_APP_ENTRY to its app folder for a development build.';

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

export interface AppRun {
  /** Folder for the run's prefix, such as "vision-screenshot-". */
  prefix: string;
  /** What Vision is asked to do, for errors: "take the screenshot". */
  action: string;
  /** File name Vision writes in the run's folder, such as "screenshot.png". */
  output: string;
  /** What that file is, for errors: "the PNG". */
  written: string;
  /** Mode arguments, given the output's path. */
  args: (out: string) => string[];
}

/** Runs the app in one of its headless modes in a temporary folder and returns what it wrote. */
export async function runApp(app: VisionApp, appRun: AppRun): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), appRun.prefix));
  try {
    const out = join(dir, appRun.output);
    await run(
      app.command,
      [...app.args, ...appRun.args(out), `--user-data-dir=${join(dir, 'profile')}`],
      appRun.action,
    );
    return await readOutput(out, appRun.written);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function run(command: string, args: string[], action: string): Promise<void> {
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
      reject(new VisionAppError(`Couldn't start Vision at ${command}: ${error.message}`));
    });
    child.on('close', (code, signal) => {
      if (code === 0) resolve();
      else if (signal !== null) {
        reject(
          new VisionAppError(`Vision didn't finish within ${timeoutSeconds} s and was stopped.`),
        );
      } else {
        const output = stderr.trim() || 'It printed no error.';
        reject(new VisionAppError(`Vision couldn't ${action} (exit code ${code}): ${output}`));
      }
    });
  });
}

async function readOutput(path: string, name: string): Promise<Buffer> {
  try {
    return await readFile(path);
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new VisionAppError(`Vision exited without writing ${name}.`, { cause: error });
    }
    throw error;
  }
}
