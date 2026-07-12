# MCP tool reference

| Tool | Mode | Purpose |
|---|---|---|
| `open_ide` | Read | Render the workbench and workspace summary |
| `workspace_info` | Read | Root, branch, changes, top-level entries, limits |
| `list_directory` | Read | Browse one workspace directory |
| `read_file` | Read | Read bounded UTF-8 content and SHA-256 version |
| `search_workspace` | Read | Text or regex search with file filters |
| `git_status` | Read | Branch, ahead/behind, changed files |
| `git_diff` | Read | Unified worktree or staged diff |
| `git_log` | Read | Recent commit metadata |
| `list_checkpoints` | Read | Available rollback snapshots |
| `save_file` | Write | Atomic create/update with hash conflict protection |
| `create_directory` | Write | Create a directory inside the workspace |
| `move_path` | Write | Move or rename a path |
| `delete_path` | Write | Delete a file or recursive directory |
| `apply_patch` | Write | Validate, dry-run, and apply unified diff |
| `run_command` | Write | Run one allowlisted executable without a shell |
| `create_checkpoint` | Write | Snapshot workspace source files |
| `restore_checkpoint` | Write | Restore snapshot after creating a safety snapshot |
| `delete_checkpoint` | Write | Remove a stored snapshot |

All tools point to the same versioned widget resource and are available to both the model and app UI. Read-only and destructive annotations are declared explicitly so ChatGPT can apply the appropriate approval behavior.
