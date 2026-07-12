import { CommandPolicy } from "./command-policy.js";
import type { PathPolicy } from "./path-policy.js";
import { ProcessService } from "./process-service.js";

export class PatchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatchValidationError";
  }
}

export class PatchService {
  private readonly paths: PathPolicy;
  private readonly processes: ProcessService;
  private readonly maxPatchBytes: number;

  constructor(paths: PathPolicy, options: { maxPatchBytes?: number } = {}) {
    this.paths = paths;
    this.processes = new ProcessService(paths, new CommandPolicy(["git"]), {
      maxOutputBytes: 512 * 1024,
      maxTimeoutMs: 120_000,
    });
    this.maxPatchBytes = options.maxPatchBytes ?? 2 * 1024 * 1024;
  }

  async apply(patch: string): Promise<{ files: string[]; output: string }> {
    if (!patch.trim()) throw new PatchValidationError("Patch cannot be empty.");
    if (Buffer.byteLength(patch, "utf8") > this.maxPatchBytes) {
      throw new PatchValidationError(`Patch exceeds the ${this.maxPatchBytes}-byte limit.`);
    }
    const files = await this.validatePaths(patch);
    const check = await this.processes.run("git", ["apply", "--check", "--whitespace=nowarn", "-"], {
      input: patch,
      timeoutMs: 30_000,
    });
    if (check.exitCode !== 0) {
      throw new PatchValidationError(check.stderr || check.stdout || "git apply --check failed.");
    }
    const applied = await this.processes.run("git", ["apply", "--whitespace=nowarn", "-"], {
      input: patch,
      timeoutMs: 30_000,
    });
    if (applied.exitCode !== 0) {
      throw new Error(applied.stderr || applied.stdout || "git apply failed.");
    }
    return { files, output: applied.stdout || applied.stderr };
  }

  private async validatePaths(patch: string): Promise<string[]> {
    const found = new Set<string>();
    for (const line of patch.split(/\r?\n/)) {
      const prefix = ["--- ", "+++ ", "rename from ", "rename to "].find((candidate) => line.startsWith(candidate));
      if (!prefix) continue;
      let value = line.slice(prefix.length).split("\t", 1)[0]?.trim() ?? "";
      if (!value || value === "/dev/null") continue;
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      value = value.replace(/^[ab]\//, "");
      try {
        await this.paths.resolve(value);
      } catch (error) {
        throw new PatchValidationError(
          `Patch path is outside the workspace: ${value}. ${error instanceof Error ? error.message : ""}`,
        );
      }
      found.add(value);
    }
    if (found.size === 0) {
      throw new PatchValidationError("Patch does not contain recognizable file headers.");
    }
    return [...found].toSorted();
  }
}
