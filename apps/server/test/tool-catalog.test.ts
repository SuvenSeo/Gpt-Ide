import assert from "node:assert/strict";
import test from "node:test";

import { TOOL_CATALOG, WIDGET_URI } from "../src/tool-catalog.ts";

void test("publishes a complete, unique tool surface", () => {
  const names = TOOL_CATALOG.map((tool) => tool.name);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(names, [
    "open_ide",
    "workspace_info",
    "list_directory",
    "read_file",
    "search_workspace",
    "git_status",
    "git_diff",
    "git_log",
    "list_checkpoints",
    "save_file",
    "create_directory",
    "move_path",
    "delete_path",
    "apply_patch",
    "run_command",
    "create_checkpoint",
    "restore_checkpoint",
    "delete_checkpoint"
  ]);
});

void test("marks tools with correct safety and widget metadata", () => {
  assert.match(WIDGET_URI, /^ui:\/\/gpt-ide\/workspace-v\d+\.html$/);
  for (const tool of TOOL_CATALOG) {
    assert.equal(typeof tool.description, "string");
    assert.equal(tool.meta.resourceUri, WIDGET_URI);
    assert.equal(typeof tool.annotations.readOnlyHint, "boolean");
    assert.equal(tool.annotations.openWorldHint, false);
  }

  const mutating = TOOL_CATALOG.filter((tool) => !tool.annotations.readOnlyHint);
  assert.ok(mutating.length > 0);
  assert.ok(mutating.every((tool) => tool.annotations.destructiveHint === true));
});
