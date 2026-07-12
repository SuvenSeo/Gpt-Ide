import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { PathPolicy } from "./path-policy.js";

export class FileConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileConflictError";
  }
}

export interface FileServiceOptions {
  maxFileBytes?: number;
}

export interface WorkspaceEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink" | "other";
  size: number;
  modifiedAt: string;
  hidden: boolean;
}

export interface TextFile {
  path: string;
  content: string;
  hash: string;
  size: number;
  modifiedAt: string;
}

function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function isRenameCollision(error: unknown): boolean {
  return error instanceof Error && "code" in error && ["EEXIST", "EPERM"].includes(String(error.code));
}

export class FileService {
  private readonly paths: PathPolicy;
  private readonly maxFileBytes: number;

  constructor(paths: PathPolicy, options: FileServiceOptions = {}) {
    this.paths = paths;
    this.maxFileBytes = options.maxFileBytes ?? 2 * 1024 * 1024;
  }

  async listDirectory(relativePath = "."): Promise<WorkspaceEntry[]> {
    const directory = await this.paths.assertDirectory(relativePath);
    const entries = await readdir(directory, { withFileTypes: true });
    const detailed = await Promise.all(
      entries.map(async (entry): Promise<WorkspaceEntry> => {
        const absolute = path.join(directory, entry.name);
        const info = await lstat(absolute);
        const type = entry.isDirectory()
          ? "directory"
          : entry.isFile()
            ? "file"
            : entry.isSymbolicLink()
              ? "symlink"
              : "other";
        return {
          name: entry.name,
          path: this.paths.relative(absolute),
          type,
          size: info.size,
          modifiedAt: info.mtime.toISOString(),
          hidden: entry.name.startsWith("."),
        };
      }),
    );

    return detailed.toSorted((left, right) => {
      if (left.type === "directory" && right.type !== "directory") return -1;
      if (left.type !== "directory" && right.type === "directory") return 1;
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });
  }

  async readText(relativePath: string): Promise<TextFile> {
    const absolute = await this.paths.resolve(relativePath);
    const info = await stat(absolute);
    if (!info.isFile()) {
      throw new Error(`Not a file: ${relativePath}`);
    }
    if (info.size > this.maxFileBytes) {
      throw new Error(`File exceeds the ${this.maxFileBytes}-byte read limit.`);
    }
    const buffer = await readFile(absolute);
    if (buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0)) {
      throw new Error("Binary files cannot be opened in the text editor.");
    }
    return {
      path: this.paths.relative(absolute),
      content: buffer.toString("utf8"),
      hash: sha256(buffer),
      size: buffer.length,
      modifiedAt: info.mtime.toISOString(),
    };
  }

  async writeText(
    relativePath: string,
    content: string,
    options: { expectedHash?: string; createOnly?: boolean } = {},
  ): Promise<Omit<TextFile, "content">> {
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > this.maxFileBytes) {
      throw new Error(`Content exceeds the ${this.maxFileBytes}-byte write limit.`);
    }

    const absolute = await this.paths.resolve(relativePath);
    const parent = path.dirname(absolute);
    await this.paths.resolve(this.paths.relative(parent));
    await mkdir(parent, { recursive: true });

    let existingHash: string | undefined;
    try {
      const existing = await readFile(absolute);
      existingHash = sha256(existing);
      if (options.createOnly) {
        throw new FileConflictError(`File already exists: ${relativePath}`);
      }
    } catch (error) {
      if (error instanceof FileConflictError) throw error;
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }

    if (options.expectedHash !== undefined && options.expectedHash !== existingHash) {
      throw new FileConflictError(
        `File changed since it was opened. Expected ${options.expectedHash}, found ${existingHash ?? "missing"}.`,
      );
    }

    const temporary = path.join(parent, `.${path.basename(absolute)}.${randomUUID()}.tmp`);
    await writeFile(temporary, content, { encoding: "utf8", flag: "wx" });
    try {
      await rename(temporary, absolute);
    } catch (error) {
      if (!isRenameCollision(error)) throw error;
      await unlink(absolute).catch(() => undefined);
      await rename(temporary, absolute);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }

    const info = await stat(absolute);
    return {
      path: this.paths.relative(absolute),
      hash: sha256(content),
      size: bytes,
      modifiedAt: info.mtime.toISOString(),
    };
  }

  async createDirectory(relativePath: string): Promise<{ path: string }> {
    const absolute = await this.paths.resolve(relativePath);
    await mkdir(absolute, { recursive: true });
    return { path: this.paths.relative(absolute) };
  }

  async move(from: string, to: string): Promise<{ from: string; to: string }> {
    const source = await this.paths.resolve(from);
    const destination = await this.paths.resolve(to);
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(source, destination);
    return { from: this.paths.relative(source), to: this.paths.relative(destination) };
  }

  async delete(relativePath: string, recursive = false): Promise<{ path: string }> {
    const absolute = await this.paths.resolve(relativePath);
    if (absolute === this.paths.root) {
      throw new Error("The workspace root cannot be deleted.");
    }
    await rm(absolute, { recursive, force: false });
    return { path: this.paths.relative(absolute) };
  }
}
