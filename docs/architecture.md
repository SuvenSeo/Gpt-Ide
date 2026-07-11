# Architecture

## Product boundary

GPT IDE is an `interactive-decoupled` ChatGPT App. ChatGPT remains the conversational host and reasoning layer. A local or remotely hosted MCP server exposes workspace capabilities. The React widget renders the workbench inside ChatGPT and calls the same MCP tools directly for user-driven IDE interactions.

## Packages

### `packages/core`

Framework-independent local runtime:

- `PathPolicy`: lexical containment plus nearest-existing-ancestor realpath validation
- `FileService`: directory listing, bounded UTF-8 reads, atomic writes, hash conflict detection, move/delete
- `SearchService`: bounded recursive text/regex search with build/dependency exclusions
- `GitService`: repository status, unified diff, and recent commits
- `ProcessService`: shell-free command execution, timeout, output capture/truncation
- `PatchService`: patch size/path validation, dry-run, then apply
- `CheckpointService`: bounded snapshots, list/restore/delete

### `apps/server`

- Loads security and resource limits from environment variables
- Creates one runtime for the configured workspace
- Registers the versioned widget resource as `text/html;profile=mcp-app`
- Registers 18 tools with Zod inputs, safety annotations, UI metadata, and concise structured output
- Exposes Streamable HTTP on `/mcp`
- Maintains one transport per MCP session
- Applies host, CORS, JSON body, and optional bearer-token middleware

### `apps/widget`

- React 19 workbench bundled as one JavaScript and one CSS asset
- CodeMirror 6 editor with syntax support for JS/TS/JSX/TSX, JSON, HTML, CSS, Markdown, and Python
- Zustand state for workspace, directories, tabs, search, Git, checkpoints, terminal, and layout
- Uses `window.openai` for ChatGPT extensions and JSON-RPC `tools/call` fallback for MCP Apps hosts
- Receives `ui/notifications/tool-result` lifecycle updates

## Data flow

1. ChatGPT calls `open_ide` or another model-visible tool.
2. The server executes a bounded local operation.
3. It returns concise `structuredContent`, model narration in `content`, and widget-only metadata where needed.
4. ChatGPT loads the versioned widget resource.
5. The widget hydrates from the initial result and calls app-visible tools for direct user interaction.
6. AI action buttons send a follow-up message to ChatGPT, which can inspect and modify the workspace through the same tools.

## Consistency model

Files are read with a SHA-256 hash. Saves send `expectedHash`; the server rejects a save if the file changed after it was opened. Successful writes replace files atomically. Destructive operations create a checkpoint unless explicitly disabled.

## Failure handling

- Tool failures are surfaced in the workbench error banner, Problems panel, and Output history.
- Commands return exit code, signal, timeout, truncation, stdout, stderr, and duration.
- Patches must pass validation and `git apply --check` before mutation.
- Stale writes fail rather than silently overwrite.
- The MCP endpoint rejects unknown or missing sessions.
