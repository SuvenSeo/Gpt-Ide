import { lstat, realpath, stat } from "node:fs/promises";
import path from "node:path";

export class WorkspacePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspacePathError";
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function normalizeWorkspacePath(input: string): string {
  if (input.includes("\0")) {
    throw new WorkspacePathError("Workspace paths cannot contain null bytes.");
  }

  const portable = input.replaceAll("\\", "/").trim();
  if (!portable || portable === ".") {
    return ".";
  }
  if (portable.startsWith("/") || /^[A-Za-z]:\//.test(portable)) {
    throw new WorkspacePathError("Absolute paths are not allowed.");
  }

  const normalized = path.posix.normalize(portable).replace(/^\.\//, "");
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new WorkspacePathError("Path traversal outside the workspace is not allowed.");
  }
  return normalized;
}

export class PathPolicy {
  readonly root: string;
  private readonly canonicalRoot: string;

  private constructor(root: string, canonicalRoot: string) {
    this.root = root;
    this.canonicalRoot = canonicalRoot;
  }

  static async create(root: string): Promise<PathPolicy> {
    const absoluteRoot = path.resolve(root);
    const info = await stat(absoluteRoot);
    if (!info.isDirectory()) {
      throw new WorkspacePathError(`Workspace root is not a directory: ${absoluteRoot}`);
    }
    return new PathPolicy(absoluteRoot, await realpath(absoluteRoot));
  }

  async resolve(relativePath = "."): Promise<string> {
    const normalized = normalizeWorkspacePath(relativePath);
    const candidate = path.resolve(this.root, normalized === "." ? "" : normalized);
    if (!isWithin(this.root, candidate)) {
      throw new WorkspacePathError("Resolved path is outside the workspace.");
    }

    const existingAncestor = await this.findExistingAncestor(candidate);
    const canonicalAncestor = await realpath(existingAncestor);
    if (!isWithin(this.canonicalRoot, canonicalAncestor)) {
      throw new WorkspacePathError("Symbolic link resolves outside the workspace.");
    }

    try {
      const canonicalCandidate = await realpath(candidate);
      if (!isWithin(this.canonicalRoot, canonicalCandidate)) {
        throw new WorkspacePathError("Symbolic link resolves outside the workspace.");
      }
    } catch (error) {
      if (!isMissing(error)) {
        throw error;
      }
    }

    return candidate;
  }

  relative(absolutePath: string): string {
    const relative = path.relative(this.root, absolutePath);
    if (!isWithin(this.root, absolutePath)) {
      throw new WorkspacePathError("Path is outside the workspace.");
    }
    return relative === "" ? "." : relative.split(path.sep).join("/");
  }

  async assertDirectory(relativePath = "."): Promise<string> {
    const resolved = await this.resolve(relativePath);
    const info = await stat(resolved);
    if (!info.isDirectory()) {
      throw new WorkspacePathError(`Not a directory: ${relativePath}`);
    }
    return resolved;
  }

  private async findExistingAncestor(candidate: string): Promise<string> {
    let current = candidate;
    while (true) {
      try {
        await lstat(current);
        return current;
      } catch (error) {
        if (!isMissing(error)) {
          throw error;
        }
      }
      const parent = path.dirname(current);
      if (parent === current || !isWithin(this.root, parent)) {
        return this.root;
      }
      current = parent;
    }
  }
}
