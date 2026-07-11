# Full GPT IDE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-oriented fullscreen ChatGPT coding workspace with secure local tools and a complete IDE widget.

**Architecture:** A Node/TypeScript MCP server registers a versioned React widget resource and typed coding tools. A dependency-light core package owns all local side effects and is tested independently. The React widget talks to tools through the MCP Apps bridge and uses ChatGPT extensions only for fullscreen, theme, persisted widget state, and follow-up prompts.

**Tech Stack:** Node.js 22, TypeScript 5.9, MCP TypeScript SDK v1, `@modelcontextprotocol/ext-apps`, React 19, CodeMirror 6, Zustand, Vite/esbuild, Zod 4, Node test runner.

## Global Constraints

- All local access is restricted to `WORKSPACE_ROOT`.
- No interpolated shell commands; command and arguments are separate.
- All mutating operations are approval-annotated and checkpoint-capable.
- Widget templates use `text/html;profile=mcp-app` and a versioned `ui://` URI.
- The app remains usable without ChatGPT-only extensions by using the standard MCP Apps bridge first.

---

### Task 1: Core security and filesystem runtime

**Files:** `packages/core/src/path-policy.ts`, `file-service.ts`, `command-policy.ts`, and tests under `packages/core/test/`.

- [x] Write failing tests for traversal, symlink escape, atomic writes, stale hashes, and command allowlisting.
- [x] Run the tests and confirm failures are caused by missing modules.
- [ ] Implement the minimum runtime and make tests pass.
- [ ] Refactor shared errors and limits.

### Task 2: Search, Git, patch, and checkpoint services

**Files:** `packages/core/src/search-service.ts`, `git-service.ts`, `patch-service.ts`, `checkpoint-service.ts` and matching tests.

- [ ] Add behavior tests for fallback search, patch path validation, snapshot exclusions, and checkpoint restore.
- [ ] Implement services and verify tests.

### Task 3: MCP server and HTTP transport

**Files:** `apps/server/src/server.ts`, `tools.ts`, `http.ts`, `config.ts`, `widget-resource.ts`.

- [ ] Register versioned widget resource.
- [ ] Register read, write, Git, command, patch, and checkpoint tools with exact schemas and annotations.
- [ ] Add optional bearer authentication, CORS/host validation, health endpoint, and Streamable HTTP transport.
- [ ] Add server contract tests.

### Task 4: IDE widget foundation

**Files:** `apps/widget/src/bridge/*`, `store/*`, `components/*`, `styles.css`.

- [ ] Build a portable MCP Apps bridge client with `window.openai` fallback.
- [ ] Add responsive three-pane shell, activity bar, tabs, bottom panel, and status bar.
- [ ] Add theme and fullscreen integration.

### Task 5: Explorer and editor

- [ ] Implement lazy directory loading, file tabs, dirty-state tracking, CodeMirror language selection, save conflicts, rename/create/delete flows, and keyboard shortcuts.

### Task 6: Search, Git, terminal, checkpoints, and AI actions

- [ ] Implement workspace search, Git status/diff, command runner/history, checkpoint management, patch application, and selected-code follow-up prompts.

### Task 7: Documentation, CI, and verification

- [ ] Add setup, ChatGPT Developer Mode, tunneling, environment, security, deployment, and troubleshooting documentation.
- [ ] Add GitHub Actions for install, typecheck, test, and build.
- [ ] Run core tests, static TypeScript checks, manifest validation, and repository QA.
