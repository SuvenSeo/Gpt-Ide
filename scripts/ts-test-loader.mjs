import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && specifier.endsWith(".js")) {
    const candidate = new URL(specifier.slice(0, -3) + ".ts", context.parentURL);
    try {
      await access(fileURLToPath(candidate));
      return nextResolve(candidate.href, context);
    } catch {
      // Fall through to normal Node resolution.
    }
  }
  return nextResolve(specifier, context);
}
