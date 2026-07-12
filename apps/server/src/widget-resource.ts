import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

async function firstReadable(paths: string[]): Promise<string> {
  let lastError: unknown;
  for (const candidate of paths) {
    try {
      return await readFile(candidate, "utf8");
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Widget asset is missing. Run npm run build -w @gpt-ide/widget. ${String(lastError)}`);
}

export async function buildWidgetHtml(): Promise<string> {
  const roots = [
    path.resolve(process.cwd(), "apps/widget/dist"),
    path.resolve(here, "../../widget/dist"),
  ];
  const javascript = await firstReadable(roots.map((root) => path.join(root, "widget.js")));
  const css = await firstReadable(roots.map((root) => path.join(root, "widget.css")));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${javascript}</script>
</body>
</html>`;
}
