import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { PathPolicy } from "./path-policy.js";

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".gpt-ide",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".cache",
]);

export interface SearchRequest {
  query: string;
  path?: string;
  regex?: boolean;
  caseSensitive?: boolean;
  maxResults?: number;
  filePattern?: string;
}

export interface SearchMatch {
  path: string;
  line: number;
  column: number;
  text: string;
}

export interface SearchResult {
  matches: SearchMatch[];
  truncated: boolean;
  filesSearched: number;
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "[^/]*")
    .replaceAll("__DOUBLE_STAR__", ".*")
    .replaceAll("?", ".");
  return new RegExp(`^${escaped}$`, "i");
}

export class SearchService {
  private readonly paths: PathPolicy;
  private readonly maxSearchFileBytes: number;

  constructor(paths: PathPolicy, options: { maxSearchFileBytes?: number } = {}) {
    this.paths = paths;
    this.maxSearchFileBytes = options.maxSearchFileBytes ?? 2 * 1024 * 1024;
  }

  async search(request: SearchRequest): Promise<SearchResult> {
    if (!request.query) throw new Error("Search query cannot be empty.");
    const root = await this.paths.assertDirectory(request.path ?? ".");
    const maxResults = Math.max(1, Math.min(request.maxResults ?? 200, 2_000));
    const flags = request.caseSensitive ? "" : "i";
    const expression = request.regex
      ? new RegExp(request.query, flags)
      : new RegExp(request.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    const fileFilter = request.filePattern ? wildcardToRegExp(request.filePattern) : undefined;
    const matches: SearchMatch[] = [];
    let filesSearched = 0;
    let truncated = false;

    const visit = async (directory: string): Promise<void> => {
      if (truncated) return;
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (truncated) break;
        if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await visit(absolute);
          continue;
        }
        if (!entry.isFile()) continue;
        const relative = this.paths.relative(absolute);
        if (fileFilter && !fileFilter.test(relative)) continue;
        const info = await stat(absolute);
        if (info.size > this.maxSearchFileBytes) continue;
        const buffer = await readFile(absolute);
        if (buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0)) continue;
        filesSearched += 1;
        const lines = buffer.toString("utf8").split(/\r?\n/);
        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index] ?? "";
          expression.lastIndex = 0;
          const match = expression.exec(line);
          if (!match) continue;
          matches.push({
            path: relative,
            line: index + 1,
            column: match.index + 1,
            text: line.slice(0, 500),
          });
          if (matches.length >= maxResults) {
            truncated = true;
            break;
          }
        }
      }
    };

    await visit(root);
    return { matches, truncated, filesSearched };
  }
}
