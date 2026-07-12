import { spawn } from "node:child_process";
import type { CommandPolicy } from "./command-policy.js";
import type { PathPolicy } from "./path-policy.js";

export interface ProcessServiceOptions {
  maxOutputBytes?: number;
  maxTimeoutMs?: number;
  defaultTimeoutMs?: number;
}

export interface RunProcessOptions {
  cwd?: string;
  timeoutMs?: number;
  input?: string;
}

export interface ProcessResult {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
}

export class ProcessService {
  private readonly paths: PathPolicy;
  private readonly policy: CommandPolicy;
  private readonly maxOutputBytes: number;
  private readonly maxTimeoutMs: number;
  private readonly defaultTimeoutMs: number;

  constructor(paths: PathPolicy, policy: CommandPolicy, options: ProcessServiceOptions = {}) {
    this.paths = paths;
    this.policy = policy;
    this.maxOutputBytes = options.maxOutputBytes ?? 256 * 1024;
    this.maxTimeoutMs = options.maxTimeoutMs ?? 5 * 60_000;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 120_000;
  }

  async run(command: string, args: readonly string[], options: RunProcessOptions = {}): Promise<ProcessResult> {
    const validated = this.policy.validate(command, args);
    const cwd = await this.paths.assertDirectory(options.cwd ?? ".");
    const timeoutMs = Math.max(100, Math.min(options.timeoutMs ?? this.defaultTimeoutMs, this.maxTimeoutMs));
    const startedAt = Date.now();

    return await new Promise<ProcessResult>((resolve, reject) => {
      const child = spawn(validated.command, validated.args, {
        cwd,
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let capturedBytes = 0;
      let truncated = false;
      let timedOut = false;
      let settled = false;

      const capture = (target: Buffer[], chunk: Buffer): void => {
        const remaining = this.maxOutputBytes - capturedBytes;
        if (remaining <= 0) {
          truncated = true;
          return;
        }
        if (chunk.length > remaining) {
          target.push(chunk.subarray(0, remaining));
          capturedBytes += remaining;
          truncated = true;
          return;
        }
        target.push(chunk);
        capturedBytes += chunk.length;
      };

      child.stdout.on("data", (chunk: Buffer) => capture(stdout, chunk));
      child.stderr.on("data", (chunk: Buffer) => capture(stderr, chunk));

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 1_000).unref();
      }, timeoutMs);
      timer.unref();

      child.once("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });

      child.once("close", (exitCode, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          command: validated.command,
          args: validated.args,
          cwd: this.paths.relative(cwd),
          exitCode,
          signal,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
          timedOut,
          truncated,
          durationMs: Date.now() - startedAt,
        });
      });

      if (options.input !== undefined) {
        child.stdin.end(options.input, "utf8");
      } else {
        child.stdin.end();
      }
    });
  }
}
