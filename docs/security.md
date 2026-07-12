# Security and threat model

GPT IDE can read, modify, and execute code in a local repository. Treat its MCP endpoint as a privileged development interface.

## Protected assets

- Source code and secrets stored in the selected workspace
- Local developer credentials reachable through commands or repository files
- Integrity of the working tree and Git history
- Host resources consumed by builds and tests

## Trust boundaries

1. ChatGPT and the MCP client send tool inputs to the server.
2. The server converts those inputs into local filesystem, Git, or process operations.
3. The widget is sandboxed by ChatGPT but can request app-visible tools.
4. An HTTPS tunnel or production ingress exposes the MCP endpoint to a network.

## Implemented controls

### Workspace isolation

- Rejects absolute paths, drive-qualified paths, NUL bytes, and parent traversal.
- Uses `path.relative` containment checks.
- Resolves the nearest existing ancestor with `realpath` to block symlink escapes.
- Refuses deletion of the workspace root.
- Skips symlinks while creating checkpoints.

### File integrity

- Enforces read/write byte limits.
- Rejects binary files in the text editor.
- Writes through a unique temporary file and atomic rename.
- Supports `expectedHash` optimistic concurrency.
- Supports create-only writes.

### Process isolation

- Uses `spawn(executable, args, { shell: false })`.
- Rejects executable paths and NUL bytes.
- Requires exact allowlist membership.
- Bounds timeout and aggregate captured output.
- Restricts the working directory to the workspace.

The command allowlist is not a complete sandbox. Allowed tools such as Node, Python, package managers, and Git can execute repository code and may access resources available to the server process. Run the server under a dedicated low-privilege account or inside a hardened container for stronger isolation.

### Change recovery

- Destructive tools are annotated as mutating/destructive.
- File writes, moves, deletes, patches, and restores create checkpoints by default.
- Restore creates an additional safety checkpoint first.
- Patch paths are validated and patches are dry-run before apply.

### Network surface

- Binds to loopback by default.
- Validates the `Host` header against `ALLOWED_HOSTS`.
- Only emits CORS permission for configured origins.
- Supports an optional constant-time bearer-token comparison.
- Disables Express's `x-powered-by` header.
- Limits JSON request bodies.

## Deployment requirements

For a publicly reachable deployment:

- Use OAuth or another user-bound authentication scheme appropriate for MCP clients. The optional static bearer token is intended for controlled clients, not public multi-user distribution.
- Use TLS at the ingress.
- Run one isolated workspace per user/session. Do not share a writable workspace between unrelated users.
- Run as an unprivileged OS user with minimal filesystem permissions.
- Place the process in a container/VM with CPU, memory, process, and network limits.
- Remove interpreters and package managers from `COMMAND_ALLOWLIST` when not required.
- Do not mount SSH keys, cloud credentials, browser profiles, or a home directory.
- Record audit logs at the ingress and process boundary.
- Rotate tunnel URLs and credentials after accidental disclosure.

## Known residual risks

- An approved allowlisted interpreter can run arbitrary repository code.
- A malicious dependency or test can exfiltrate data if the process has network access.
- Checkpoints are local snapshots, not immutable backups.
- Large repositories may exceed configured checkpoint limits.
- ChatGPT tool confirmation is an additional control, not a replacement for server-side authorization.
