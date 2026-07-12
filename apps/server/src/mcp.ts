import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WorkspaceRuntime } from "./runtime.js";
import { catalogEntry, descriptorMeta, TOOL_CATALOG, WIDGET_URI } from "./tool-catalog.js";
import { buildWidgetHtml } from "./widget-resource.js";

function result(data: Record<string, unknown>, text: string, metadata: Record<string, unknown> = {}) {
  return {
    structuredContent: data,
    content: [{ type: "text" as const, text }],
    _meta: metadata,
  };
}

async function checkpointBefore(runtime: WorkspaceRuntime, enabled: boolean, label: string) {
  return enabled ? runtime.checkpoints.create(label) : undefined;
}

function configFor<T extends z.ZodRawShape>(name: string, inputSchema: T) {
  const entry = catalogEntry(name);
  return {
    title: entry.title,
    description: entry.description,
    inputSchema,
    annotations: entry.annotations,
    _meta: descriptorMeta(name),
  };
}

export async function createMcpServer(runtime: WorkspaceRuntime): Promise<McpServer> {
  const server = new McpServer(
    { name: "gpt-ide", version: "1.0.0" },
    {
      instructions:
        "GPT IDE controls one configured local workspace. Read before editing, use expectedHash on saves, create checkpoints before risky changes, never invent paths, and ask for user confirmation before mutating tools.",
    },
  );

  const widgetHtml = await buildWidgetHtml();
  registerAppResource(server, "gpt-ide-widget", WIDGET_URI, {}, () => ({
    contents: [{
      uri: WIDGET_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: widgetHtml,
      _meta: {
        ui: {
          prefersBorder: false,
          ...(runtime.config.widgetDomain ? { domain: runtime.config.widgetDomain } : {}),
          csp: { connectDomains: [], resourceDomains: [] },
        },
        "openai/widgetDescription": "A fullscreen local coding workspace with explorer, editor, search, Git, terminal, checkpoints, and AI actions.",
      },
    }],
  }));

  registerAppTool(server, "open_ide", configFor("open_ide", {
    focusPath: z.string().optional().describe("Optional workspace-relative file to focus."),
  }), async ({ focusPath }) => {
    const summary = await runtime.summary();
    return result({ kind: "workspace", summary, focusPath: focusPath ?? null }, "GPT IDE is ready.");
  });

  registerAppTool(server, "workspace_info", configFor("workspace_info", {}), async () => {
    const summary = await runtime.summary();
    return result({ kind: "workspace", summary }, `Workspace ${String(summary.name)} inspected.`);
  });

  registerAppTool(server, "list_directory", configFor("list_directory", {
    path: z.string().default(".").describe("Workspace-relative directory path."),
  }), async ({ path }) => {
    const entries = await runtime.files.listDirectory(path);
    return result({ kind: "directory", path, entries }, `Listed ${entries.length} entries in ${path}.`);
  });

  registerAppTool(server, "read_file", configFor("read_file", {
    path: z.string().describe("Workspace-relative UTF-8 file path."),
  }), async ({ path }) => {
    const file = await runtime.files.readText(path);
    return result({ kind: "file", file }, `Read ${file.path} (${file.size} bytes).`);
  });

  registerAppTool(server, "search_workspace", configFor("search_workspace", {
    query: z.string().min(1),
    path: z.string().default("."),
    regex: z.boolean().default(false),
    caseSensitive: z.boolean().default(false),
    maxResults: z.number().int().min(1).max(2000).default(200),
    filePattern: z.string().optional(),
  }), async (input) => {
    const search = await runtime.search.search({
      query: input.query,
      path: input.path,
      regex: input.regex,
      caseSensitive: input.caseSensitive,
      maxResults: input.maxResults,
      ...(input.filePattern ? { filePattern: input.filePattern } : {}),
    });
    return result({ kind: "search", query: input.query, ...search }, `Found ${search.matches.length} matches.`);
  });

  registerAppTool(server, "git_status", configFor("git_status", {}), async () => {
    const status = await runtime.git.status();
    return result({ kind: "git-status", status }, `Git status contains ${status.files.length} changed files.`);
  });

  registerAppTool(server, "git_diff", configFor("git_diff", {
    path: z.string().optional(),
    staged: z.boolean().default(false),
    contextLines: z.number().int().min(0).max(50).default(3),
  }), async (input) => {
    const diff = await runtime.git.diff({
      staged: input.staged,
      contextLines: input.contextLines,
      ...(input.path ? { path: input.path } : {}),
    });
    return result({ kind: "git-diff", ...input, ...diff }, diff.diff ? "Git diff loaded." : "No Git diff is present.");
  });

  registerAppTool(server, "git_log", configFor("git_log", {
    limit: z.number().int().min(1).max(100).default(20),
  }), async ({ limit }) => {
    const commits = await runtime.git.recentCommits(limit);
    return result({ kind: "git-log", commits }, `Loaded ${commits.length} commits.`);
  });

  registerAppTool(server, "list_checkpoints", configFor("list_checkpoints", {}), async () => {
    const checkpoints = await runtime.checkpoints.list();
    return result({ kind: "checkpoints", checkpoints }, `Loaded ${checkpoints.length} checkpoints.`);
  });

  registerAppTool(server, "save_file", configFor("save_file", {
    path: z.string(),
    content: z.string(),
    expectedHash: z.string().optional(),
    createOnly: z.boolean().default(false),
    createCheckpoint: z.boolean().default(true),
  }), async ({ path, content, expectedHash, createOnly, createCheckpoint }) => {
    const checkpoint = await checkpointBefore(runtime, createCheckpoint, `Before saving ${path}`);
    const file = await runtime.files.writeText(path, content, {
      createOnly,
      ...(expectedHash ? { expectedHash } : {}),
    });
    return result({ kind: "saved-file", file, checkpoint: checkpoint ?? null }, `Saved ${file.path}.`);
  });

  registerAppTool(server, "create_directory", configFor("create_directory", {
    path: z.string(),
  }), async ({ path }) => {
    const directory = await runtime.files.createDirectory(path);
    return result({ kind: "created-directory", directory }, `Created ${directory.path}.`);
  });

  registerAppTool(server, "move_path", configFor("move_path", {
    from: z.string(),
    to: z.string(),
    createCheckpoint: z.boolean().default(true),
  }), async ({ from, to, createCheckpoint }) => {
    const checkpoint = await checkpointBefore(runtime, createCheckpoint, `Before moving ${from}`);
    const moved = await runtime.files.move(from, to);
    return result({ kind: "moved-path", moved, checkpoint: checkpoint ?? null }, `Moved ${from} to ${to}.`);
  });

  registerAppTool(server, "delete_path", configFor("delete_path", {
    path: z.string(),
    recursive: z.boolean().default(false),
    createCheckpoint: z.boolean().default(true),
  }), async ({ path, recursive, createCheckpoint }) => {
    const checkpoint = await checkpointBefore(runtime, createCheckpoint, `Before deleting ${path}`);
    const deleted = await runtime.files.delete(path, recursive);
    return result({ kind: "deleted-path", deleted, checkpoint: checkpoint ?? null }, `Deleted ${path}.`);
  });

  registerAppTool(server, "apply_patch", configFor("apply_patch", {
    patch: z.string().min(1),
    createCheckpoint: z.boolean().default(true),
  }), async ({ patch, createCheckpoint }) => {
    const checkpoint = await checkpointBefore(runtime, createCheckpoint, "Before applying patch");
    const applied = await runtime.patches.apply(patch);
    return result({ kind: "applied-patch", applied, checkpoint: checkpoint ?? null }, `Applied patch to ${applied.files.length} files.`);
  });

  registerAppTool(server, "run_command", configFor("run_command", {
    executable: z.string(),
    args: z.array(z.string()).default([]),
    cwd: z.string().default("."),
    timeoutMs: z.number().int().positive().optional(),
    input: z.string().optional(),
    createCheckpoint: z.boolean().default(false),
  }), async ({ executable, args, cwd, timeoutMs, input, createCheckpoint }) => {
    const checkpoint = await checkpointBefore(runtime, createCheckpoint, `Before running ${executable}`);
    const execution = await runtime.processes.run(executable, args, {
      cwd,
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
      ...(input !== undefined ? { input } : {}),
    });
    return result({ kind: "command", executable, args, cwd, execution, checkpoint: checkpoint ?? null }, `${executable} exited with code ${execution.exitCode}.`);
  });

  registerAppTool(server, "create_checkpoint", configFor("create_checkpoint", {
    label: z.string().min(1).max(200),
  }), async ({ label }) => {
    const checkpoint = await runtime.checkpoints.create(label);
    return result({ kind: "created-checkpoint", checkpoint }, `Created checkpoint ${checkpoint.label}.`);
  });

  registerAppTool(server, "restore_checkpoint", configFor("restore_checkpoint", {
    id: z.string(),
  }), async ({ id }) => {
    const safety = await runtime.checkpoints.create(`Before restoring ${id}`);
    const restored = await runtime.checkpoints.restore(id, { removeExtra: true });
    return result({ kind: "restored-checkpoint", id, restored, safetyCheckpoint: safety }, `Restored checkpoint ${id}.`);
  });

  registerAppTool(server, "delete_checkpoint", configFor("delete_checkpoint", {
    id: z.string(),
  }), async ({ id }) => {
    await runtime.checkpoints.remove(id);
    return result({ kind: "deleted-checkpoint", id }, `Deleted checkpoint ${id}.`);
  });

  if (TOOL_CATALOG.length !== 18) throw new Error("Tool catalog and server registration are out of sync.");
  return server;
}
