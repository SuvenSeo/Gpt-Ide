import { build } from "esbuild";
import { rm } from "node:fs/promises";

await rm(new URL("./dist", import.meta.url), { recursive: true, force: true });
await build({
  entryPoints: { widget: new URL("./src/index.tsx", import.meta.url).pathname },
  outdir: new URL("./dist", import.meta.url).pathname,
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
