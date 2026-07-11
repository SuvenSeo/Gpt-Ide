import path from "node:path";

export interface ServerConfig {
  workspaceRoot: string;
  host: string;
  port: number;
  apiToken: string | undefined;
  allowedHosts: Set<string>;
  allowedOrigins: Set<string>;
  commandAllowlist: Set<string>;
  maxFileBytes: number;
  maxOutputBytes: number;
  maxCommandTimeoutMs: number;
  maxCheckpointBytes: number;
  maxCheckpointFiles: number;
  widgetDomain: string | undefined;
}

const DEFAULT_COMMANDS = [
  "npm", "pnpm", "yarn", "npx", "node", "bun", "deno",
  "python", "python3", "pytest", "git", "cargo", "go", "make",
  "cmake", "dotnet", "java", "mvn", "gradle"
];

function positiveInteger(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function csv(value: string | undefined, fallback: string[]): Set<string> {
  const source = value?.split(",") ?? fallback;
  return new Set(source.map((item) => item.trim()).filter(Boolean));
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): ServerConfig {
  const workspaceRoot = path.resolve(cwd, env.WORKSPACE_ROOT || ".");
  return {
    workspaceRoot,
    host: env.HOST || "127.0.0.1",
    port: positiveInteger(env, "PORT", 8000),
    apiToken: env.API_TOKEN || undefined,
    allowedHosts: csv(env.ALLOWED_HOSTS, ["localhost", "127.0.0.1", "[::1]"]),
    allowedOrigins: csv(env.ALLOWED_ORIGINS, ["https://chatgpt.com", "https://chat.openai.com"]),
    commandAllowlist: csv(env.COMMAND_ALLOWLIST, DEFAULT_COMMANDS),
    maxFileBytes: positiveInteger(env, "MAX_FILE_BYTES", 2 * 1024 * 1024),
    maxOutputBytes: positiveInteger(env, "MAX_OUTPUT_BYTES", 1024 * 1024),
    maxCommandTimeoutMs: positiveInteger(env, "MAX_COMMAND_TIMEOUT_MS", 120_000),
    maxCheckpointBytes: positiveInteger(env, "MAX_CHECKPOINT_BYTES", 100 * 1024 * 1024),
    maxCheckpointFiles: positiveInteger(env, "MAX_CHECKPOINT_FILES", 20_000),
    widgetDomain: env.WIDGET_DOMAIN || undefined,
  };
}
