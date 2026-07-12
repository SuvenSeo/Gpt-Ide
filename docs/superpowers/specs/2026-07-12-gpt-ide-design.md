# GPT IDE Design Specification

## Product

GPT IDE is a fullscreen ChatGPT App that turns a ChatGPT conversation into a secure coding workspace. ChatGPT provides reasoning and natural-language orchestration. A local MCP server provides bounded filesystem, search, Git, process, patch, and checkpoint tools. A React widget provides the IDE surface.

## Architecture

- **ChatGPT host:** model conversation, tool selection, approvals, follow-up messages, and fullscreen presentation.
- **MCP server:** publishes the widget resource and typed tools over `/mcp`.
- **Core runtime:** enforces workspace containment, command policy, output limits, atomic writes, patch validation, Git operations, and snapshots.
- **React widget:** explorer, tabs, CodeMirror editor, search, source control, terminal, checkpoints, status bar, and AI actions.

The app uses an interactive-decoupled pattern: model-facing tool responses contain concise summaries; large editor payloads stay in widget-only metadata. Widget actions call MCP tools directly through the MCP Apps bridge with a `window.openai` fallback.

## Security requirements

1. Every filesystem path is resolved beneath one configured workspace root.
2. Realpath and symlink checks prevent escape through symbolic links.
3. File writes are atomic and support optimistic concurrency with SHA-256 hashes.
4. Shell execution uses executable-plus-arguments, never an interpolated shell command.
5. Executables must match a configurable allowlist; arguments containing null bytes are rejected.
6. Commands have time, output, and working-directory limits.
7. Patch paths are inspected before `git apply` is invoked.
8. Destructive tools are accurately annotated for ChatGPT approval.
9. Checkpoints exclude `.git`, dependency caches, build products, and the checkpoint store itself.
10. The HTTP endpoint supports an optional bearer token and validates allowed hosts/origins.

## User flows

- Open the IDE and request fullscreen.
- Browse folders lazily and open text files in tabs.
- Edit and save with conflict detection.
- Search code and jump to matches.
- Ask ChatGPT to explain, fix, refactor, or test the selected code.
- Review Git status and diffs.
- Run approved commands and tests with streamed-style captured output.
- Create, list, and restore checkpoints.
- Apply model-generated unified patches.
- Create, rename, and delete workspace paths with approvals.

## Non-goals

- Replacing ChatGPT's outer application shell.
- Bypassing ChatGPT, Codex, or API usage policies.
- Providing unrestricted host filesystem or shell access.
- Implementing language-server protocol hosting in v1; diagnostics are command-driven.
