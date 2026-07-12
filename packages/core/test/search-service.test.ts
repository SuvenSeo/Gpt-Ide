import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PathPolicy } from "../src/path-policy.ts";
import { SearchService } from "../src/search-service.ts";

void test("finds matching lines and excludes dependency directories", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-search-"));
  await mkdir(path.join(root, "src"));
  await mkdir(path.join(root, "node_modules"));
  await writeFile(path.join(root, "src", "app.ts"), "alpha\nneedle here\nomega\n");
  await writeFile(path.join(root, "node_modules", "ignored.ts"), "needle\n");
  const service = new SearchService(await PathPolicy.create(root));
  const result = await service.search({ query: "needle", maxResults: 10 });
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0]?.path, "src/app.ts");
  assert.equal(result.matches[0]?.line, 2);
});

void test("supports case-insensitive regular expressions", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-search-"));
  await writeFile(path.join(root, "file.txt"), "Hello WORLD\n");
  const service = new SearchService(await PathPolicy.create(root));
  const result = await service.search({ query: "hello\\s+world", regex: true, caseSensitive: false });
  assert.equal(result.matches.length, 1);
});
