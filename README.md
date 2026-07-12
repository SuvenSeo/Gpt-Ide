# GPT IDE

A full coding workspace rendered **inside ChatGPT**. ChatGPT supplies the model conversation and tool decisions; GPT IDE supplies a sandboxed local workspace, code editor, repository search, Git inspection, terminal execution, patches, and rollback checkpoints through an MCP server.

> This project does not automate or scrape the ChatGPT website. It is a ChatGPT App built with the Apps SDK and MCP Apps bridge.

## What is included

- Fullscreen React workbench with file explorer, tabs, CodeMirror editor, search, source control, terminal/output/problems panel, checkpoints, and AI actions
- 18 MCP tools covering workspace browsing, file reads/writes, repository search, Git status/diff/history, unified patches, commands, and checkpoint lifecycle
- Workspace-root path confinement with traversal and symlink-escape prevention
- Atomic file writes and SHA-256 optimistic concurrency checks
- Shell-free command execution with an executable allowlist, timeouts, and output limits
- Automatic checkpoints before destructive changes
- Streamable HTTP MCP transport with session management, host validation, CORS policy, and optional bearer authentication
- Responsive dark/light interface, fullscreen support, keyboard shortcuts, and persistent widget layout state

## Architecture

```text
ChatGPT model and conversation
        │
        │ MCP tool calls + app UI
        ▼
GPT IDE MCP server (/mcp)
        │
        ├── sandboxed filesystem
        ├── Git + unified patches
        ├── bounded process runner
        ├── repository search
        └── local checkpoints

ChatGPT iframe
        └── React + CodeMirror workbench
```

The model continues to run in ChatGPT. This app does not call the OpenAI API or Codex App Server. It therefore does not require an OpenAI API key for model reasoning. ChatGPT plan limits still apply; the project does not create unlimited usage.

## Requirements

- Node.js 22 or later
- Git
- One supported package manager in the command allowlist
- An HTTPS tunnel for local ChatGPT testing, or an HTTPS deployment

## Install

```bash
npm install
cp .env.example .env
```

Set `WORKSPACE_ROOT` to the repository GPT IDE should control. Do not point it at your home directory or an entire drive.

Build all packages:

```bash
npm run build
```

Run tests and strict checks:

```bash
npm run check
```

Start the MCP server:

```bash
npm run dev:server
```

Health endpoint:

```bash
curl http://127.0.0.1:8000/health
```

## Connect to ChatGPT

1. Build the widget and start the server.
2. Expose port `8000` over HTTPS, for example with `ngrok http 8000`.
3. Add the tunnel hostname to `ALLOWED_HOSTS` and restart the server.
4. In ChatGPT, open **Settings → Apps & Connectors → Advanced settings** and enable Developer Mode.
5. Create a new app and use `https://YOUR-TUNNEL-HOST/mcp` as the MCP URL.
6. Refresh the app after tool metadata or widget changes.
7. Ask ChatGPT: **“Open GPT IDE for this workspace.”**

ChatGPT requires the MCP endpoint to be reachable over HTTPS. See `docs/deployment.md` for tunnel and production guidance.

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Save active file | `Ctrl/⌘ S` |
| Quick open | `Ctrl/⌘ P` |
| Toggle terminal | `Ctrl/⌘ J` |
| Open workspace search | `Ctrl/⌘ Shift F` |
| Send custom AI task | `Ctrl/⌘ Enter` in the AI prompt |

## Security defaults

- All file paths are resolved beneath one configured workspace root.
- Existing symlink ancestors are realpath-checked to block escapes.
- The terminal receives an executable and argument array; it never invokes a shell.
- Commands are allowlisted and bounded by execution time and captured output.
- Writes are atomic and can require the file hash observed at read time.
- Patches are path-validated and checked with `git apply --check` before applying.
- Checkpoints exclude `.git`, dependencies, caches, and build outputs.
- Destructive MCP tools are annotated for confirmation and create checkpoints by default.

Read `docs/security.md` before exposing the server outside a local development tunnel.

## Repository layout

```text
apps/
  server/     MCP tools, widget resource, Streamable HTTP transport
  widget/     React/CodeMirror ChatGPT workbench
packages/
  core/       Filesystem, search, Git, patch, command, checkpoint runtime
docs/         Architecture, security, deployment, and tool reference
```

## Official references

- OpenAI Apps SDK quickstart: https://developers.openai.com/apps-sdk/quickstart
- Build an MCP server: https://developers.openai.com/apps-sdk/build/mcp-server
- Build a ChatGPT UI: https://developers.openai.com/apps-sdk/build/chatgpt-ui
- Define tools: https://developers.openai.com/apps-sdk/plan/tools
- Apps SDK reference: https://developers.openai.com/apps-sdk/reference

## License

MIT
