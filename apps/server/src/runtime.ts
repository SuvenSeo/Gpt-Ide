import path from "node:path";
import {
  CheckpointService,
  CommandPolicy,
  FileService,
  GitService,
  PatchService,
  PathPolicy,
  ProcessService,
  SearchService,
} from "@gpt-ide/core";
import type { ServerConfig } from "./config.js";

export interface WorkspaceRuntime {
  config: ServerConfig;
  paths: PathPolicy;
  files: FileService;
  search: SearchService;
  git: GitService;
  patches: PatchService;
  processes: ProcessService;
  checkpoints: CheckpointService;
  summary(): Promise<Record<string, unknown>>;
}

export function createRuntime(config: ServerConfig): WorkspaceRuntime {
  const paths = new PathPolicy(config.workspaceRoot);
  const files = new FileService(paths, { maxFileBytes: config.maxFileBytes });
  const search = new SearchService(paths, { maxSearchFileBytes: config.maxFileBytes });
  const git = new GitService(paths);
  const patches = new PatchService(paths, { maxPatchBytes: config.maxFileBytes });
  const processes = new ProcessService(paths, new CommandPolicy(config.commandAllowlist), {
    maxOutputBytes: config.maxOutputBytes,
    maxTimeoutMs: config.maxCommandTimeoutMs,
  });
  const checkpoints = new CheckpointService(paths, {
    maxBytes: config.maxCheckpointBytes,
    maxFiles: config.maxCheckpointFiles,
  });

  return {
    config,
    paths,
    files,
    search,
    git,
    patches,
    processes,
    checkpoints,
    async summary() {
      const [entries, status, checkpointList] = await Promise.all([
        files.listDirectory("."),
        git.status(),
        checkpoints.list(),
      ]);
      return {
        name: path.basename(config.workspaceRoot),
        workspaceRoot: config.workspaceRoot,
        branch: status.branch,
        isRepository: status.isRepository,
        changedFiles: status.files.length,
        ahead: status.ahead,
        behind: status.behind,
        entries,
        checkpoints: checkpointList.length,
        commandAllowlist: [...config.commandAllowlist].toSorted(),
      };
    },
  };
}
