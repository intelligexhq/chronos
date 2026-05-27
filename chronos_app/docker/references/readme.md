# Operator-copyable reference code

Code in this directory is meant to be **copied into your own projects** as a starting point for integrating with Chronos. Each subdirectory is a small, self-contained example that demonstrates one specific protocol surface.

| Subdirectory                                     | What it is                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [`agent-http/`](./agent-http/)                   | Minimal HTTP agent that calls back into the Chronos MCP gateway. Use as the template for your own Chronos-aware agent.                     |
| [`mcp-streamable-http/`](./mcp-streamable-http/) | Minimal MCP server speaking the Streamable HTTP transport. Exposes two tools (`echo`, `add`). Use as the template for your own MCP server. |

For **internal test fixtures** (the smoke runner and the stdio MCP fixture), see [`../fixtures/`](../fixtures/) instead. Those are not for copying.

## Walkthrough — agent registry + MCP gateway

The compose file `../docker-compose.walkthrough.yml` boots these references alongside Chronos + Postgres so you can register them through the UI and see the full agent-registry round-trip.

### Setup

Build the local Chronos image (the stack consumes `chronos:local`):

```bash
cd chronos_app/docker
docker build -f Dockerfile.local -t chronos:local ..
```

Run the stack:

```bash
docker compose -f docker-compose.walkthrough.yml up
```

Services:

| Service          | Host port        | Notes                                              |
| ---------------- | ---------------- | -------------------------------------------------- |
| Chronos UI / API | `localhost:3001` | Initial user `admin@admin.com` / `test1234`        |
| Postgres         | `localhost:5432` |                                                    |
| `mcp-reference`  | `localhost:7800` | Streamable-HTTP MCP server, exposes `echo` + `add` |
| `example-agent`  | `localhost:8001` | `GET /health`, `POST /v1/chat/completions`         |

### 1. Register the MCP server

1. Open `http://localhost:3001`, sign in with the initial user.
2. **MCP Servers** → **Register MCP Server**.
3. Fill in:
    - **Name:** `Reference`
    - **Slug:** `reference`
    - **Transport:** `streamable-http`
    - **URL:** `http://mcp-reference:7800/mcp`
    - **allowedTools:** click **Discover Tools** to list the live catalog and tick `add` (and `echo` if you want). Free-text fallback works too.
4. Save.

### 2. Register the example agent

1. **Agents** → **Register Agent**, pick **HTTP**.
2. Fill in:
    - **Name:** `Example agent`
    - **Slug:** `example-agent`
    - **Service endpoint:** `http://example-agent:8001`
    - **Health endpoint:** leave blank (defaults to the service endpoint root).
    - **Outbound auth:** None for this demo.
    - **allowedTools:** add `reference.add`. **Load from MCP Servers** populates the autocomplete.
3. Save.

### 3. (Optional) Pre-configure the MCP gateway token

The example agent supports two ways to receive its token:

-   **In-band (default).** Chronos injects `x-chronos-mcp-gateway-token` on every forward request. No env var needed.
-   **Pre-configured.** Set `MCP_GATEWAY_TOKEN` on the agent at boot. Use for high-sensitivity deployments. Env wins over the header.

To use the env path:

1. Click into the new agent → Overview → reveal the **MCP Gateway Token** → copy.
2. Set on the host and restart only the agent service:

```bash
EXAMPLE_AGENT_MCP_GATEWAY_TOKEN=<paste-hex-here> \
  docker compose -f docker-compose.walkthrough.yml up -d --no-deps example-agent
```

3. Confirm: `docker compose logs --tail 5 example-agent` should say `MCP gateway token configured via env`.

### 4. Invoke the agent

Get an API key from **Settings → API Keys** in the UI, then issue a prompt that contains a `<n> + <m>` expression so the agent calls back into the MCP gateway. From inside the docker network:

```bash
docker compose exec chronos sh -c '
    curl -s -X POST http://chronos:3000/api/v1/agents/example-agent/invoke \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <YOUR-API-KEY>" \
      -d "{\"messages\":[{\"role\":\"user\",\"content\":\"please compute 2 + 3\"}]}"
'
```

Expected response:

```json
{"id":"...","object":"chat.completion","choices":[{"index":0,"message":{"role":"assistant","content":"2 + 3 = 5"},"finish_reason":"stop"}],...}
```

`docker compose logs chronos` will show one `event=mcp.tool.invoke` audit line per round-trip and a corresponding row in `tool_invocation_audit` (visible from the **Audit Log** page in the UI).

#### Why invoke from inside the network?

The MCP gateway URL Chronos hands the agent is built from the inbound request's `Host` header. If you invoke through `localhost:3001` from your host, the gateway URL points at `localhost:3001` — which the agent container cannot reach. Invoking through the docker service name (`http://chronos:3000`) keeps the gateway URL on the docker network.

For production deployments, set `BASE_URL` on the Chronos service to a fixed reachable URL.

### Editing the example agent

```bash
docker compose -f docker-compose.walkthrough.yml build example-agent
docker compose -f docker-compose.walkthrough.yml up -d --no-deps example-agent
```

### Cleanup

```bash
docker compose -f docker-compose.walkthrough.yml down
docker compose -f docker-compose.walkthrough.yml down --volumes   # also drops .postgres_data / .chronos
```
