import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * @param {string} specifier
 * @param {{ parentURL?: string }} context
 * @param {(specifier: string, context: { parentURL?: string }) => Promise<unknown>} nextResolve
 * @returns {Promise<unknown>}
 */
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
