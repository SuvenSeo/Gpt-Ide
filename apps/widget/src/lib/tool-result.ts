export function getStructuredContent(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const direct = value as { structuredContent?: unknown; result?: unknown };
  if (direct.structuredContent && typeof direct.structuredContent === "object") {
    return direct.structuredContent as Record<string, unknown>;
  }
  if (direct.result && typeof direct.result === "object") {
    const wrapped = direct.result as { structuredContent?: unknown };
    if (wrapped.structuredContent && typeof wrapped.structuredContent === "object") {
      return wrapped.structuredContent as Record<string, unknown>;
    }
  }
  return {};
}
