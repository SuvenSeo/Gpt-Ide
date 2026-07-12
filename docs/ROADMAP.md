# GPT IDE Roadmap

This roadmap keeps the project focused on a secure local-first ChatGPT coding workspace before attempting broader distribution.

## Phase 1: Local developer workspace

Status: implemented on `main`.

- ChatGPT App workbench with file explorer, editor, search, source control, terminal output, and AI actions
- MCP server with typed tools for filesystem, Git, process execution, patches, search, and checkpoints
- Workspace-root confinement, symlink escape checks, atomic writes, bounded command execution, and checkpoint recovery
- CI for typecheck, tests, build, and lint

## Phase 2: Hardening and operator ergonomics

Status: next.

- Add a guided setup wizard for `WORKSPACE_ROOT`, `ALLOWED_HOSTS`, and command allowlist tuning
- Add a visible security preflight screen before connecting a workspace
- Add one-click command allowlist presets for Node, Python, Java, and static-site repos
- Add checkpoint browser search, diff preview, and selective restore
- Add structured audit log export for file writes, patches, deletes, command runs, and checkpoint restores
- Add screenshot/GIF assets for the README once the UI has a stable demo flow

## Phase 3: Safer execution isolation

Status: planned.

- Provide a Docker Compose profile for running the MCP server as a low-privilege user
- Add resource limits for CPU, memory, process count, and network access in the recommended container profile
- Add a no-network execution mode for tests and commands
- Add optional per-workspace policy files for command allowlist, max file size, max output size, and destructive-action settings
- Add e2e tests for tunnel/host validation and destructive action confirmations

## Phase 4: Collaboration and release readiness

Status: planned.

- Add release tags and changelog generation
- Add app-submission checklist for ChatGPT Apps distribution
- Add signed release artifacts for the server bundle
- Add reusable templates for bug reports, feature requests, and security reviews
- Add multi-workspace read-only indexing mode

## Non-goals for now

- Public multi-tenant cloud IDE hosting
- Running without an explicit local or controlled hosted MCP server
- Bypassing ChatGPT plan limits
- Scraping or automating the ChatGPT website
- Treating command allowlists as a full sandbox
