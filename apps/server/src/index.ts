import { loadConfig } from "./config.js";
import { createHttpApp } from "./http.js";
import { createRuntime } from "./runtime.js";

const config = loadConfig();
const runtime = await createRuntime(config);
const app = createHttpApp(config, runtime);

app.listen(config.port, config.host, () => {
  console.log(`GPT IDE MCP server: http://${config.host}:${config.port}/mcp`);
  console.log(`Workspace: ${config.workspaceRoot}`);
});
