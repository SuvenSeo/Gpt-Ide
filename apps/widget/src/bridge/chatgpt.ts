import { getStructuredContent } from "../lib/tool-result";

type ToolResultListener = (result: unknown) => void;

interface OpenAIHost {
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  sendFollowUpMessage?: (options: { prompt: string }) => Promise<void>;
  requestDisplayMode?: (options: { mode: "inline" | "pip" | "fullscreen" }) => Promise<unknown>;
  setWidgetState?: (state: Record<string, unknown>) => Promise<void> | void;
  toolOutput?: unknown;
  widgetState?: Record<string, unknown>;
  theme?: "light" | "dark";
  displayMode?: string;
}

declare global {
  interface Window {
    openai?: OpenAIHost;
  }
}

class PostMessageBridge {
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>();
  private readonly listeners = new Set<ToolResultListener>();

  constructor() {
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent || !event.data || event.data.jsonrpc !== "2.0") return;
      const message = event.data as { id?: number; result?: unknown; error?: unknown; method?: string; params?: unknown };
      if (typeof message.id === "number") {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(message.error);
        else pending.resolve(message.result);
        return;
      }
      if (message.method === "ui/notifications/tool-result") {
        for (const listener of this.listeners) listener(message.params);
      }
    }, { passive: true });
  }

  request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    });
  }

  subscribe(listener: ToolResultListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const bridge = typeof window !== "undefined" ? new PostMessageBridge() : undefined;

export async function callTool<T extends Record<string, unknown> = Record<string, unknown>>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const response = window.openai?.callTool
    ? await window.openai.callTool(name, args)
    : await bridge?.request("tools/call", { name, arguments: args });
  return getStructuredContent(response) as T;
}

export function subscribeToToolResults(listener: ToolResultListener): () => void {
  return bridge?.subscribe(listener) ?? (() => undefined);
}

export async function sendToChatGPT(prompt: string): Promise<void> {
  if (!window.openai?.sendFollowUpMessage) {
    throw new Error("Follow-up messaging is only available inside ChatGPT.");
  }
  await window.openai.sendFollowUpMessage({ prompt });
}

export async function requestFullscreen(): Promise<void> {
  await window.openai?.requestDisplayMode?.({ mode: "fullscreen" });
}

export function persistWidgetState(state: Record<string, unknown>): void {
  void window.openai?.setWidgetState?.(state);
}

export function initialToolOutput(): unknown {
  return window.openai?.toolOutput;
}

export function initialWidgetState(): Record<string, unknown> {
  return window.openai?.widgetState ?? {};
}
