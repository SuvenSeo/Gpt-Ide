import assert from "node:assert/strict";
import test from "node:test";

import { parseCommandLine } from "../src/lib/command-line.ts";
import { languageForPath } from "../src/lib/language.ts";
import { getStructuredContent } from "../src/lib/tool-result.ts";

test("parses quoted command arguments without invoking a shell", () => {
  assert.deepEqual(parseCommandLine('npm run test -- --grep "hello world"'), {
    executable: "npm",
    args: ["run", "test", "--", "--grep", "hello world"],
  });
  assert.throws(() => parseCommandLine("npm test && rm -rf ."), /Shell operators/);
});

test("maps common file extensions to editor languages", () => {
  assert.equal(languageForPath("src/app.tsx"), "typescript-jsx");
  assert.equal(languageForPath("package.json"), "json");
  assert.equal(languageForPath("README.md"), "markdown");
  assert.equal(languageForPath("Dockerfile"), "plain");
});

test("normalizes direct and bridge-wrapped tool results", () => {
  assert.deepEqual(getStructuredContent({ structuredContent: { ok: true } }), { ok: true });
  assert.deepEqual(getStructuredContent({ result: { structuredContent: { ok: true } } }), { ok: true });
  assert.deepEqual(getStructuredContent(undefined), {});
});
