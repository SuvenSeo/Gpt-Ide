export const WIDGET_URI = "ui://gpt-ide/workspace-v1.html";

export interface ToolCatalogEntry {
  name: string;
  title: string;
  description: string;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: false;
    idempotentHint?: boolean;
  };
  meta: {
    resourceUri: string;
    invoking: string;
    invoked: string;
  };
}

function readOnly(
  name: string,
  title: string,
  description: string,
  invoking: string,
  invoked: string,
): ToolCatalogEntry {
  return {
    name,
    title,
    description,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    meta: { resourceUri: WIDGET_URI, invoking, invoked },
  };
}

function mutating(
  name: string,
  title: string,
  description: string,
  invoking: string,
  invoked: string,
  idempotentHint = false,
): ToolCatalogEntry {
  return {
    name,
    title,
    description,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false, idempotentHint },
    meta: { resourceUri: WIDGET_URI, invoking, invoked },
  };
}

export const TOOL_CATALOG: ToolCatalogEntry[] = [
  readOnly("open_ide", "Open GPT IDE", "Use this when the user wants to open or work in the IDE for the configured local workspace.", "Opening GPT IDE…", "GPT IDE opened."),
  readOnly("workspace_info", "Inspect workspace", "Use this when you need the workspace root, Git branch, change count, and top-level files.", "Inspecting workspace…", "Workspace inspected."),
  readOnly("list_directory", "List directory", "Use this when you need to browse a directory in the configured workspace.", "Listing directory…", "Directory listed."),
  readOnly("read_file", "Read file", "Use this when you need the current UTF-8 contents and version hash of a workspace file.", "Reading file…", "File read."),
  readOnly("search_workspace", "Search workspace", "Use this when you need bounded text or regular-expression search across workspace files.", "Searching workspace…", "Search complete."),
  readOnly("git_status", "Get Git status", "Use this when you need branch, ahead/behind state, and changed files.", "Checking Git status…", "Git status ready."),
  readOnly("git_diff", "Get Git diff", "Use this when you need a unified Git diff for the workspace or one file.", "Loading Git diff…", "Git diff ready."),
  readOnly("git_log", "Get Git history", "Use this when you need recent commits from the workspace repository.", "Loading Git history…", "Git history ready."),
  readOnly("list_checkpoints", "List checkpoints", "Use this when you need available local rollback checkpoints.", "Loading checkpoints…", "Checkpoints ready."),
  mutating("save_file", "Save file", "Use this when the user approves creating or replacing a UTF-8 workspace file. Supply expectedHash to prevent stale overwrites.", "Saving file…", "File saved.", true),
  mutating("create_directory", "Create directory", "Use this when the user approves creating a workspace directory.", "Creating directory…", "Directory created.", true),
  mutating("move_path", "Move or rename path", "Use this when the user approves moving or renaming a file or directory inside the workspace.", "Moving path…", "Path moved."),
  mutating("delete_path", "Delete path", "Use this when the user explicitly approves deleting a workspace file or directory.", "Deleting path…", "Path deleted.", true),
  mutating("apply_patch", "Apply patch", "Use this when the user approves applying a validated unified diff inside the workspace.", "Applying patch…", "Patch applied."),
  mutating("run_command", "Run command", "Use this when the user approves an allowlisted executable and explicit argument array in the workspace. Commands never run through a shell.", "Running command…", "Command finished."),
  mutating("create_checkpoint", "Create checkpoint", "Use this before risky edits or when the user wants a restorable local snapshot.", "Creating checkpoint…", "Checkpoint created."),
  mutating("restore_checkpoint", "Restore checkpoint", "Use this when the user explicitly approves replacing workspace files with a stored checkpoint.", "Restoring checkpoint…", "Checkpoint restored."),
  mutating("delete_checkpoint", "Delete checkpoint", "Use this when the user explicitly approves removing a stored checkpoint.", "Deleting checkpoint…", "Checkpoint deleted.", true),
];

export function catalogEntry(name: string): ToolCatalogEntry {
  const entry = TOOL_CATALOG.find((tool) => tool.name === name);
  if (!entry) throw new Error(`Unknown tool catalog entry: ${name}`);
  return entry;
}

export function descriptorMeta(name: string) {
  const tool = catalogEntry(name);
  return {
    ui: { resourceUri: tool.meta.resourceUri, visibility: ["model", "app"] },
    "openai/outputTemplate": tool.meta.resourceUri,
    "openai/widgetAccessible": true,
    "openai/toolInvocation/invoking": tool.meta.invoking,
    "openai/toolInvocation/invoked": tool.meta.invoked,
  } as const;
}
