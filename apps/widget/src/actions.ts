import {
  callTool,
  initialToolOutput,
  persistWidgetState,
  requestFullscreen,
  sendToChatGPT,
  subscribeToToolResults,
} from "./bridge/chatgpt";
import { parseCommandLine } from "./lib/command-line";
import { getStructuredContent } from "./lib/tool-result";
import { useIdeStore } from "./store/ide-store";
import type {
  Checkpoint,
  CommandExecution,
  GitStatus,
  OpenFile,
  SearchMatch,
  WorkspaceEntry,
  WorkspaceSummary,
} from "./types";

function state() {
  return useIdeStore.getState();
}

async function guarded<T>(key: string, operation: () => Promise<T>): Promise<T | undefined> {
  state().setLoading(key, true);
  state().setError(undefined);
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state().setError(message);
    state().addOutput(`[error] ${message}`);
    return undefined;
  } finally {
    state().setLoading(key, false);
  }
}

function applyStructured(content: Record<string, unknown>): void {
  const kind = content.kind;
  if (kind === "workspace" && content.summary) {
    state().setSummary(content.summary as WorkspaceSummary);
  } else if (kind === "directory") {
    state().setDirectory(String(content.path ?? "."), (content.entries ?? []) as WorkspaceEntry[]);
  } else if (kind === "file" && content.file) {
    const file = content.file as Omit<OpenFile, "savedContent" | "dirty" | "selection">;
    state().openFile({ ...file, savedContent: file.content, dirty: false, selection: "" });
  } else if (kind === "git-status" && content.status) {
    state().setGit(content.status as GitStatus);
  } else if (kind === "git-diff") {
    state().setGitDiff(String(content.diff ?? ""));
  } else if (kind === "checkpoints") {
    state().setCheckpoints((content.checkpoints ?? []) as Checkpoint[]);
  } else if (kind === "search") {
    state().setSearch(
      String(content.query ?? ""),
      (content.matches ?? []) as SearchMatch[],
      Boolean(content.truncated),
    );
  }
}

export async function initializeIde(): Promise<() => void> {
  const initial = getStructuredContent(initialToolOutput());
  if (Object.keys(initial).length > 0) applyStructured(initial);
  const unsubscribe = subscribeToToolResults((value) => applyStructured(getStructuredContent(value)));
  await Promise.all([refreshWorkspace(), refreshGit(), refreshCheckpoints()]);
  return unsubscribe;
}

export async function refreshWorkspace(): Promise<void> {
  await guarded("workspace", async () => {
    const content = await callTool<{ summary: WorkspaceSummary }>("workspace_info");
    if (content.summary) state().setSummary(content.summary);
  });
}

export async function loadDirectory(path: string): Promise<void> {
  await guarded(`directory:${path}`, async () => {
    const content = await callTool<{ path: string; entries: WorkspaceEntry[] }>("list_directory", { path });
    state().setDirectory(content.path ?? path, content.entries ?? []);
  });
}

export async function toggleDirectory(path: string): Promise<void> {
  const current = state();
  const opening = !current.expandedDirectories.has(path);
  current.toggleDirectory(path);
  if (opening && !current.directories[path]) await loadDirectory(path);
}

export async function openPath(path: string): Promise<void> {
  const existing = state().openFiles.find((file) => file.path === path);
  if (existing) {
    state().setActivePath(path);
    return;
  }
  await guarded(`file:${path}`, async () => {
    const content = await callTool<{ file: Omit<OpenFile, "savedContent" | "dirty" | "selection"> }>("read_file", { path });
    if (content.file) state().openFile({ ...content.file, savedContent: content.file.content, dirty: false, selection: "" });
  });
}

export async function saveFile(path: string): Promise<void> {
  const file = state().openFiles.find((candidate) => candidate.path === path);
  if (!file || !file.dirty) return;
  await guarded(`save:${path}`, async () => {
    const content = await callTool<{ file: { hash: string; modifiedAt: string; size: number } }>("save_file", {
      path,
      content: file.content,
      expectedHash: file.hash,
      createCheckpoint: true,
    });
    if (content.file) state().markFileSaved(path, content.file.hash, content.file.modifiedAt, content.file.size);
    await Promise.all([refreshGit(), loadDirectory(parentPath(path))]);
  });
}

export async function createFile(parent = "."): Promise<void> {
  const path = window.prompt("New file path", parent === "." ? "" : `${parent}/`);
  if (!path) return;
  await guarded(`create:${path}`, async () => {
    await callTool("save_file", { path, content: "", createOnly: true, createCheckpoint: false });
    await loadDirectory(parentPath(path));
    await openPath(path);
    await refreshGit();
  });
}

export async function createDirectory(parent = "."): Promise<void> {
  const path = window.prompt("New directory path", parent === "." ? "" : `${parent}/`);
  if (!path) return;
  await guarded(`mkdir:${path}`, async () => {
    await callTool("create_directory", { path });
    await loadDirectory(parentPath(path));
  });
}

export async function renamePath(path: string): Promise<void> {
  const target = window.prompt("Move or rename to", path);
  if (!target || target === path) return;
  await guarded(`move:${path}`, async () => {
    await callTool("move_path", { from: path, to: target, createCheckpoint: true });
    const open = state().openFiles.find((file) => file.path === path);
    if (open) state().closeFile(path);
    await Promise.all([loadDirectory(parentPath(path)), loadDirectory(parentPath(target)), refreshGit()]);
    if (open) await openPath(target);
  });
}

export async function deletePath(path: string, recursive: boolean): Promise<void> {
  if (!window.confirm(`Delete ${path}? A checkpoint will be created first.`)) return;
  await guarded(`delete:${path}`, async () => {
    await callTool("delete_path", { path, recursive, createCheckpoint: true });
    state().closeFile(path);
    await Promise.all([loadDirectory(parentPath(path)), refreshGit(), refreshCheckpoints()]);
  });
}

export async function runWorkspaceSearch(query: string, options: { regex?: boolean; caseSensitive?: boolean; filePattern?: string } = {}): Promise<void> {
  if (!query.trim()) return;
  await guarded("search", async () => {
    const content = await callTool<{ matches: SearchMatch[]; truncated: boolean }>("search_workspace", {
      query,
      path: ".",
      regex: options.regex ?? false,
      caseSensitive: options.caseSensitive ?? false,
      maxResults: 500,
      ...(options.filePattern ? { filePattern: options.filePattern } : {}),
    });
    state().setSearch(query, content.matches ?? [], Boolean(content.truncated));
  });
}

export async function refreshGit(): Promise<void> {
  await guarded("git", async () => {
    const content = await callTool<{ status: GitStatus }>("git_status");
    if (content.status) state().setGit(content.status);
  });
}

export async function loadGitDiff(path?: string, staged = false): Promise<void> {
  await guarded("diff", async () => {
    const content = await callTool<{ diff: string }>("git_diff", { ...(path ? { path } : {}), staged, contextLines: 5 });
    state().setGitDiff(content.diff ?? "");
    state().setBottomPanel("output", true);
  });
}

export async function refreshCheckpoints(): Promise<void> {
  await guarded("checkpoints", async () => {
    const content = await callTool<{ checkpoints: Checkpoint[] }>("list_checkpoints");
    state().setCheckpoints(content.checkpoints ?? []);
  });
}

export async function createCheckpoint(label?: string): Promise<void> {
  const resolved = label ?? window.prompt("Checkpoint label", `Manual checkpoint ${new Date().toLocaleString()}`);
  if (!resolved) return;
  await guarded("checkpoint:create", async () => {
    await callTool("create_checkpoint", { label: resolved });
    await refreshCheckpoints();
  });
}

export async function restoreCheckpoint(checkpoint: Checkpoint): Promise<void> {
  if (!window.confirm(`Restore “${checkpoint.label}”? A safety checkpoint will be created first.`)) return;
  await guarded(`checkpoint:restore:${checkpoint.id}`, async () => {
    await callTool("restore_checkpoint", { id: checkpoint.id });
    for (const file of state().openFiles) state().closeFile(file.path);
    await Promise.all([refreshWorkspace(), refreshGit(), refreshCheckpoints()]);
  });
}

export async function deleteCheckpoint(checkpoint: Checkpoint): Promise<void> {
  if (!window.confirm(`Delete checkpoint “${checkpoint.label}”?`)) return;
  await guarded(`checkpoint:delete:${checkpoint.id}`, async () => {
    await callTool("delete_checkpoint", { id: checkpoint.id });
    await refreshCheckpoints();
  });
}

export async function executeCommand(commandLine: string, cwd: string): Promise<void> {
  await guarded("command", async () => {
    const parsed = parseCommandLine(commandLine);
    const content = await callTool<{ execution: CommandExecution }>("run_command", {
      executable: parsed.executable,
      args: parsed.args,
      cwd,
      timeoutMs: 120_000,
      createCheckpoint: false,
    });
    if (content.execution) state().setExecution(content.execution, commandLine);
    state().setBottomPanel("terminal", true);
    await refreshGit();
  });
}

export async function applyPatchFromUi(patch: string): Promise<void> {
  if (!patch.trim()) return;
  if (!window.confirm("Apply this patch? A checkpoint will be created first.")) return;
  await guarded("patch", async () => {
    await callTool("apply_patch", { patch, createCheckpoint: true });
    for (const file of state().openFiles) state().closeFile(file.path);
    await Promise.all([refreshWorkspace(), refreshGit(), refreshCheckpoints()]);
  });
}

export async function sendAiAction(action: string, customInstructions = ""): Promise<void> {
  const current = state();
  const file = current.openFiles.find((candidate) => candidate.path === current.activePath);
  const selection = file?.selection.trim();
  const context = file
    ? selection
      ? `The selected code in ${file.path} is:\n\n\`\`\`\n${selection}\n\`\`\``
      : `Focus on the workspace file ${file.path}. Read it with the app tools before answering.`
    : "Inspect the configured workspace with the app tools.";
  await guarded("ai", async () => {
    await sendToChatGPT(`${action}\n\n${context}${customInstructions ? `\n\nAdditional instructions: ${customInstructions}` : ""}\n\nUse GPT IDE tools to inspect, edit, run tests, and verify as needed. Ask for approval before mutating actions.`);
  });
}

export async function enterFullscreen(): Promise<void> {
  await guarded("fullscreen", requestFullscreen);
}

export function saveUiState(): void {
  const current = state();
  persistWidgetState({
    activePath: current.activePath,
    activityView: current.activityView,
    bottomPanel: current.bottomPanel,
    bottomPanelOpen: current.bottomPanelOpen,
    aiPanelOpen: current.aiPanelOpen,
    commandCwd: current.commandCwd,
  });
}

function parentPath(filePath: string): string {
  const parts = filePath.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/") || ".";
}
