import { randomUUID } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PathPolicy } from "./path-policy.js";

const DEFAULT_EXCLUDED_NAMES = new Set([
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

interface CheckpointManifest {
  id: string;
  label: string;
  createdAt: string;
  files: string[];
  bytes: number;
}

export interface CheckpointSummary extends CheckpointManifest {}

export class CheckpointService {
  private readonly paths: PathPolicy;
  private readonly store: string;
  private readonly maxBytes: number;
  private readonly maxFiles: number;

  constructor(paths: PathPolicy, options: { maxBytes?: number; maxFiles?: number } = {}) {
    this.paths = paths;
    this.store = path.join(paths.root, ".gpt-ide", "checkpoints");
    this.maxBytes = options.maxBytes ?? 50 * 1024 * 1024;
    this.maxFiles = options.maxFiles ?? 10_000;
  }

  async create(label: string): Promise<CheckpointSummary> {
    const id = `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
    const destination = path.join(this.store, id, "files");
    await mkdir(destination, { recursive: true });
    const files: string[] = [];
    let bytes = 0;

    const visit = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (DEFAULT_EXCLUDED_NAMES.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        const relative = this.paths.relative(absolute);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          await visit(absolute);
          continue;
        }
        if (!entry.isFile()) continue;
        const info = await stat(absolute);
        bytes += info.size;
        files.push(relative);
        if (bytes > this.maxBytes) {
          throw new Error(`Checkpoint exceeds the ${this.maxBytes}-byte limit.`);
        }
        if (files.length > this.maxFiles) {
          throw new Error(`Checkpoint exceeds the ${this.maxFiles}-file limit.`);
        }
        const target = path.join(destination, ...relative.split("/"));
        await mkdir(path.dirname(target), { recursive: true });
        await cp(absolute, target, { preserveTimestamps: true });
      }
    };

    try {
      await visit(this.paths.root);
      const manifest: CheckpointManifest = {
        id,
        label: label.trim() || "Checkpoint",
        createdAt: new Date().toISOString(),
        files,
        bytes,
      };
      await writeFile(path.join(this.store, id, "manifest.json"), JSON.stringify(manifest, null, 2));
      return manifest;
    } catch (error) {
      await rm(path.join(this.store, id), { recursive: true, force: true });
      throw error;
    }
  }

  async list(): Promise<CheckpointSummary[]> {
    try {
      const entries = await readdir(this.store, { withFileTypes: true });
      const manifests = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => this.readManifest(entry.name).catch(() => undefined)),
      );
      return manifests
        .filter((manifest): manifest is CheckpointManifest => manifest !== undefined)
        .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
      throw error;
    }
  }

  async restore(id: string, options: { removeExtra?: boolean } = {}): Promise<{ restoredFiles: number; removedFiles: number }> {
    const manifest = await this.readManifest(id);
    const source = path.join(this.store, id, "files");
    const expected = new Set(manifest.files);
    let removedFiles = 0;

    if (options.removeExtra) {
      const removeUnknown = async (directory: string): Promise<void> => {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          if (DEFAULT_EXCLUDED_NAMES.has(entry.name)) continue;
          const absolute = path.join(directory, entry.name);
          const relative = this.paths.relative(absolute);
          if (entry.isDirectory()) {
            await removeUnknown(absolute);
            const remaining = await readdir(absolute);
            if (remaining.length === 0) await rm(absolute, { recursive: true });
          } else if (entry.isFile() && !expected.has(relative)) {
            await rm(absolute);
            removedFiles += 1;
          }
        }
      };
      await removeUnknown(this.paths.root);
    }

    for (const relative of manifest.files) {
      const target = await this.paths.resolve(relative);
      const snapshot = path.join(source, ...relative.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      await cp(snapshot, target, { force: true, preserveTimestamps: true });
    }
    return { restoredFiles: manifest.files.length, removedFiles };
  }

  async remove(id: string): Promise<void> {
    await this.readManifest(id);
    await rm(path.join(this.store, id), { recursive: true, force: true });
  }

  private async readManifest(id: string): Promise<CheckpointManifest> {
    if (!/^[A-Za-z0-9._-]+$/.test(id)) {
      throw new Error("Invalid checkpoint identifier.");
    }
    const raw = await readFile(path.join(this.store, id, "manifest.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<CheckpointManifest>;
    if (
      parsed.id !== id ||
      typeof parsed.label !== "string" ||
      typeof parsed.createdAt !== "string" ||
      !Array.isArray(parsed.files) ||
      typeof parsed.bytes !== "number"
    ) {
      throw new Error(`Checkpoint manifest is invalid: ${id}`);
    }
    return parsed as CheckpointManifest;
  }
}
