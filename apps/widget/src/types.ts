export interface WorkspaceEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink" | "other";
  size: number;
  modifiedAt: string;
  hidden: boolean;
}

export interface WorkspaceSummary {
  name: string;
  workspaceRoot: string;
  branch: string | null;
  isRepository: boolean;
  changedFiles: number;
  ahead: number;
  behind: number;
  entries: WorkspaceEntry[];
  checkpoints: number;
  commandAllowlist: string[];
}

export interface OpenFile {
  path: string;
  content: string;
  savedContent: string;
  hash: string;
  size: number;
  modifiedAt: string;
  dirty: boolean;
  selection: string;
}

export interface SearchMatch {
  path: string;
  line: number;
  column: number;
  text: string;
}

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

export interface Checkpoint {
  id: string;
  label: string;
  createdAt: string;
  files: string[];
  bytes: number;
}

export interface CommandExecution {
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
}

export type ActivityView = "explorer" | "search" | "source-control" | "checkpoints";
export type BottomPanel = "terminal" | "output" | "problems";
