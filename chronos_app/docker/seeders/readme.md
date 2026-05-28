# Build / seed tooling

Helper services that run once at compose-up time to populate a fresh Chronos with usable demo data. Not meant for production deployments.

| Subdirectory                 | What it is                                                                                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`demo-seed/`](./demo-seed/) | one time seeder used by `../docker-compose.demo.yml`. Reads JSON from `seed/`, logs into Chronos, idempotently POSTs credentials + MCP servers + agentflows. Survives `down --volumes` via the placeholder-substitution layer documented in `../readme.md`. |
