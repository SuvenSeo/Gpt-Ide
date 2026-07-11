export type EditorLanguage =
  | "javascript"
  | "typescript"
  | "javascript-jsx"
  | "typescript-jsx"
  | "json"
  | "html"
  | "css"
  | "markdown"
  | "python"
  | "plain";

export function languageForPath(filePath: string): EditorLanguage {
  const name = filePath.split("/").at(-1)?.toLowerCase() ?? "";
  if (name.endsWith(".tsx")) return "typescript-jsx";
  if (name.endsWith(".ts") || name.endsWith(".mts") || name.endsWith(".cts")) return "typescript";
  if (name.endsWith(".jsx")) return "javascript-jsx";
  if (name.endsWith(".js") || name.endsWith(".mjs") || name.endsWith(".cjs")) return "javascript";
  if (name.endsWith(".json") || name.endsWith(".jsonc")) return "json";
  if (name.endsWith(".html") || name.endsWith(".htm") || name.endsWith(".svg")) return "html";
  if (name.endsWith(".css") || name.endsWith(".scss") || name.endsWith(".less")) return "css";
  if (name.endsWith(".md") || name.endsWith(".mdx")) return "markdown";
  if (name.endsWith(".py") || name.endsWith(".pyi")) return "python";
  return "plain";
}
