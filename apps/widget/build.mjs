import { build } from "esbuild";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

await rm(new URL("./dist", import.meta.url), { recursive: true, force: true });
await build({
  entryPoints: { widget: fileURLToPath(new URL("./src/index.tsx", import.meta.url)) },
  outdir: fileURLToPath(new URL("./dist", import.meta.url)),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  minify: true,
  sourcemap: true,
  legalComments: "none",
  entryNames: "[name]",
  assetNames: "[name]",
  logLevel: "info",
});
