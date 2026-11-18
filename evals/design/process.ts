import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

export interface RunOptions {
  cwd: string;
  timeoutMs?: number;
  stdoutFile?: string;
  stdin?: string;
}

export function run(
  command: string,
  args: string[],
  { cwd, timeoutMs, stdoutFile, stdin }: RunOptions,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      ...(timeoutMs === undefined ? {} : { timeout: timeoutMs, killSignal: 'SIGKILL' }),
    });
    let stdout = '';
    if (stdoutFile === undefined) {
      child.stdout?.setEncoding('utf8');
      child.stdout?.on('data', (chunk: string) => {
        stdout += chunk;
      });
    } else {
      child.stdout?.pipe(createWriteStream(stdoutFile));
    }
    let stderr = '';
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });
    // A child that exits before reading its input reports why on stderr and in its exit code.
    child.stdin?.on('error', () => undefined);
    child.stdin?.end(stdin);
    child.on('error', reject);
    child.on('close', (code) => {
      resolveRun({ code, stdout, stderr });
    });
  });
}
