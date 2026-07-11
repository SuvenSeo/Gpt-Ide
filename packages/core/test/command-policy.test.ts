import assert from "node:assert/strict";
import test from "node:test";
import { CommandPolicy, CommandPolicyError } from "../src/command-policy.ts";

test("accepts an allowlisted executable and plain arguments", () => {
  const policy = new CommandPolicy(["npm", "git"]);
  assert.deepEqual(policy.validate("npm", ["test", "--", "file.test.ts"]), {
    command: "npm",
    args: ["test", "--", "file.test.ts"],
  });
});

test("rejects executables outside the allowlist", () => {
  const policy = new CommandPolicy(["npm"]);
  assert.throws(() => policy.validate("bash", ["-c", "rm -rf /"]), CommandPolicyError);
});

test("rejects paths and null bytes in executable or arguments", () => {
  const policy = new CommandPolicy(["node"]);
  assert.throws(() => policy.validate("/usr/bin/node", []), CommandPolicyError);
  assert.throws(() => policy.validate("node", ["a\0b"]), CommandPolicyError);
});
