# In-tree test fixtures

Code in this directory exists to support Chronos's own testing. **It is not meant to be referenced as an integration template**. See [`../references/`](../references/) for practical templates.

| Subdirectory                       | What it is                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`mcp-stdio/`](./mcp-stdio/)       | Tiny stdio MCP echo server used to exercise the spawn-and-pool transport path. Two tools (`echo`, `add`) — same surface as `references/mcp-streamable-http` so transport-only assertions can be made.                                                                                     |
| [`smoke-runner/`](./smoke-runner/) | Containerized end-to-end smoke driver. Boots an embedded Streamable-HTTP MCP server + an agent `/health` stub, logs into Chronos, registers them, opens an MCP session through the gateway, asserts a real `tools/list` + `tools/call` round-trip. Used by `../docker-compose.smoke.yml`. |

## Running the smoke test

```bash
cd chronos_app/docker
docker build -f Dockerfile.local -t chronos:local ..
docker compose -f docker-compose.smoke.yml up \
    --abort-on-container-exit --exit-code-from smoke-runner
```

Look for `[smoke] PASS`. On success the runner exits 0 and the compose tears down with the same code. Any assertion failure exits non-zero.

## What the smoke covers

-   `initialize` bearer auth + constant-time compare
-   Stitched `tools/list` (Agent.allowedTools ∩ MCPServer.allowedTools)
-   Pooled MCP client from the gateway to the upstream MCP server
-   `tools/call` round-trip with assertion on the `CallToolResult` content
-   Audit-log row emitted asynchronously after the invoke

What it does **not** cover: the Chronos dispatcher → external HTTP agent half (unit-tested directly) and the stdio transport path (the `mcp-stdio` fixture is exercised by `packages/server/test/services/mcp-stdio.service.test.ts` and by manual registration in the UI; spawning under docker would require baking the fixture into the production image).
