import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PathPolicy } from "./path-policy.js";

const exec = promisify(execFile);

export interface GitStatusFile {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  staged: boolean;
  untracked: boolean;
  conflicted: boolean;
}

export interface GitStatus {
  isRepository: boolean;
  branch: string | null;
  ahead: number;
  behind: number;
  files: GitStatusFile[];
}

export class GitService {
  private readonly paths: PathPolicy;

  constructor(paths: PathPolicy) {
    this.paths = paths;
  }

  async isRepository(): Promise<boolean> {
    const result = await this.run(["rev-parse", "--is-inside-work-tree"], true);
    return result?.stdout.trim() === "true";
  }

  async status(): Promise<GitStatus> {
    const result = await this.run(["status", "--porcelain=v1", "--branch", "--untracked-files=all"], true);
    if (!result) {
      return { isRepository: false, branch: null, ahead: 0, behind: 0, files: [] };
    }
    const lines = result.stdout.split(/\r?\n/).filter(Boolean);
    const header = lines.shift() ?? "";
    const branchMatch = /^##\s+([^\s.]+|HEAD)/.exec(header);
    const aheadMatch = /ahead (\d+)/.exec(header);
    const behindMatch = /behind (\d+)/.exec(header);
    const files = lines.map((line): GitStatusFile => {
      const indexStatus = line[0] ?? " ";
      const workTreeStatus = line[1] ?? " ";
      const rawPath = line.slice(3);
      const filePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) ?? rawPath : rawPath;
      return {
        path: filePath,
        indexStatus,
        workTreeStatus,
        staged: indexStatus !== " " && indexStatus !== "?",
        untracked: indexStatus === "?" && workTreeStatus === "?",
        conflicted: ["U", "AA", "DD", "AU", "UA", "DU", "UD"].some((value) =>
          `${indexStatus}${workTreeStatus}`.includes(value),
        ),
      };
    });
    return {
      isRepository: true,
      branch: branchMatch?.[1] === "HEAD" ? null : (branchMatch?.[1] ?? null),
      ahead: Number(aheadMatch?.[1] ?? 0),
      behind: Number(behindMatch?.[1] ?? 0),
      files,
    };
  }

  async diff(options: { path?: string; staged?: boolean; contextLines?: number } = {}): Promise<{ diff: string }> {
    const args = ["diff", "--no-ext-diff", `--unified=${Math.max(0, Math.min(options.contextLines ?? 3, 50))}`];
    if (options.staged) args.push("--cached");
    if (options.path) {
      await this.paths.resolve(options.path);
      args.push("--", options.path);
    }
    const result = await this.run(args);
    return { diff: result?.stdout ?? "" };
  }

  async recentCommits(limit = 20): Promise<Array<{ hash: string; author: string; date: string; subject: string }>> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const result = await this.run([
      "log",
      `-${safeLimit}`,
      "--date=iso-strict",
      "--pretty=format:%H%x1f%an%x1f%ad%x1f%s%x1e",
    ], true);
    if (!result) return [];
    return result.stdout
      .split("\x1e")
      .map((record) => record.trim())
      .filter(Boolean)
      .map((record) => {
        const [hash = "", author = "", date = "", subject = ""] = record.split("\x1f");
        return { hash, author, date, subject };
      });
  }

  private async run(args: string[], tolerateFailure = false): Promise<{ stdout: string; stderr: string } | undefined> {
    try {
      const result = await exec("git", args, {
        cwd: this.paths.root,
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
      });
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      if (tolerateFailure) return undefined;
      const message = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);
      throw new Error(`Git command failed: ${message.trim()}`);
    }
  }
}
