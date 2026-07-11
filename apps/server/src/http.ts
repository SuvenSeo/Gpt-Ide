import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { ServerConfig } from "./config.js";
import type { WorkspaceRuntime } from "./runtime.js";
import { createMcpServer } from "./mcp.js";

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeHost(value: string): string {
  if (value.startsWith("[")) return value.split("]")[0] + "]";
  return value.split(":")[0] ?? value;
}

export function createHttpApp(config: ServerConfig, runtime: WorkspaceRuntime) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "4mb" }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = normalizeHost(req.headers.host ?? "");
    if (!config.allowedHosts.has("*") && !config.allowedHosts.has(host)) {
      res.status(403).json({ error: "Host is not allowed." });
      return;
    }
    const origin = req.headers.origin;
    if (origin && (config.allowedOrigins.has("*") || config.allowedOrigins.has(origin))) {
      res.setHeader("Access-Control-Allow-Origin", config.allowedOrigins.has("*") ? "*" : origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, mcp-session-id, last-event-id");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!config.apiToken || req.path === "/health") {
      next();
      return;
    }
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token || !secureEqual(token, config.apiToken)) {
      res.status(401).json({ error: "Valid bearer token required." });
      return;
    }
    next();
  });

  app.get("/health", async (_req, res) => {
    res.json({ ok: true, service: "gpt-ide", workspace: runtime.config.workspaceRoot });
  });

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;
      if (!transport && !sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => transports.set(id, transport!),
        });
        transport.onclose = () => {
          if (transport?.sessionId) transports.delete(transport.sessionId);
        };
        const server = await createMcpServer(runtime);
        await server.connect(transport);
      }
      if (!transport) {
        res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Invalid or missing MCP session." }, id: null });
        return;
      }
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP POST failed", error);
      if (!res.headersSent) res.status(500).json({ error: "MCP request failed." });
    }
  });

  const reuseTransport = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(400).send("Invalid or missing MCP session.");
      return;
    }
    await transport.handleRequest(req, res);
  };

  app.get("/mcp", reuseTransport);
  app.delete("/mcp", reuseTransport);

  return app;
}
