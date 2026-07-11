# GPT IDE engineering rules

- Preserve the ChatGPT App architecture; do not replace it with ChatGPT website automation.
- Keep local operations confined to `WORKSPACE_ROOT`.
- Never introduce shell execution for user-supplied commands.
- Write a failing test before changing core behavior.
- Keep MCP tools narrowly scoped, bounded, and accurately annotated.
- Use expected file hashes for edits initiated from an opened editor buffer.
- Create checkpoints before destructive changes.
- Keep model-visible `structuredContent` concise; put widget-only bulk metadata in `_meta` where practical.
- Update documentation and the versioned widget URI when contracts change.
