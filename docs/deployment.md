# Deployment

## Local ChatGPT developer-mode loop

```bash
npm install
npm run build
WORKSPACE_ROOT=/absolute/path/to/project npm run dev:server
```

Expose the server:

```bash
ngrok http 8000
```

Set the exact tunnel hostname:

```bash
ALLOWED_HOSTS=random-name.ngrok-free.app \
WORKSPACE_ROOT=/absolute/path/to/project \
npm run dev:server
```

Connect `https://random-name.ngrok-free.app/mcp` as a developer-mode app in ChatGPT. Refresh the app after changing tool descriptors, metadata, or the widget bundle.

## Container build

```bash
docker build -t gpt-ide .
docker run --rm \
  -p 8000:8000 \
  -e HOST=0.0.0.0 \
  -e ALLOWED_HOSTS=localhost \
  -e WORKSPACE_ROOT=/workspace \
  -v /absolute/path/to/project:/workspace \
  gpt-ide
```

A container limits filesystem visibility but does not make commands safe by itself. Add a read-only root filesystem where possible, drop Linux capabilities, set CPU/memory/PID limits, and configure egress restrictions.

## Production

The server is stateful because MCP Streamable HTTP sessions are held in process memory. Use sticky routing or a single instance per workspace. A production design should add:

- OAuth following the Apps SDK authentication guidance
- User-to-workspace authorization and isolation
- Durable or distributed session/event storage if horizontally scaled
- Structured audit logs and metrics
- Rate limits at ingress
- Secret management rather than `.env` files
- Sandboxed command execution in short-lived containers or microVMs
- A stable `WIDGET_DOMAIN`

The widget is inlined into the MCP resource, so it does not require a separate static host. Rebuild after UI changes and increment the versioned `WIDGET_URI` for breaking or cache-sensitive updates.
