# Chronos Observability Stack

This directory contains the configuration for locally hosted the observability stack which is configured to collect log data from running chronos containers.It consists of:

- **Grafana Alloy** - Unified telemetry collector (logs, metrics, traces)
- **Grafana Loki** - Log aggregation and storage
- **Grafana** - Visualization and dashboards

## Start observability

### Start Chronos with the observability stack

From the `chronos_app/docker` directory, run both compose files:

```bash
cd chronos_app/docker
# start observability stack
docker compose -f observability/observability-stack.yml up -d
# Grafana UI available on http://localhost:3000 | default userbame:pass -> admin / admin
# Alloy UI available on http://localhost:12345
# Loki API available on http://localhost:3100 

# start chronos containers if not running
# observability stack will detect new instances of chronos containers and will start collecting logs
docker compose -f docker-compose.yml -d
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  chronos-server │     │ chronos-worker  │
│  (container)    │     │  (containers)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │ Docker logs           │ Docker logs
         │ (json-file driver)    │ (json-file driver)
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │    Grafana Alloy      │
         │  (log collector)      │
         │  - Docker discovery   │
         │  - Log parsing        │
         │  - Label extraction   │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │    Grafana Loki       │
         │  (log storage)        │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │      Grafana          │
         │  (visualization)      │
         └───────────────────────┘
```

## Configuration Files

| File | Description |
|------|-------------|
| `docker-compose-observability.yml` | Docker Compose configuration |
| `alloy-config.alloy` | Grafana Alloy pipeline configuration |
| `loki-config.yml` | Loki storage and ingestion settings |
| `grafana/provisioning/` | Grafana auto-provisioning configs |

## Log Labels

Alloy automatically extracts the following labels from Docker containers:

| Label | Description |
|-------|-------------|
| `container` | Container name |
| `container_id` | Docker container ID |
| `image` | Docker image name |
| `service` | Docker Compose service name |
| `project` | Docker Compose project name |
| `stream` | stdout or stderr |
| `level` | Log level (if JSON formatted) |

## Querying Logs

### In Grafana

1. Go to **Explore** (compass icon)
2. Select **Loki** datasource
3. Use LogQL to query:

```logql
# All Chronos server logs
{service="chronos-server"}

# Error logs only
{service=~"chronos.*"} | json | level = "error"

# Search for specific text
{service=~"chronos.*"} |= "prediction"

# Rate of errors per minute
sum(rate({service=~"chronos.*"} | json | level = "error" [1m])) by (service)
```

### Dashboard

A pre-configured dashboard is available at:
**Dashboards → Chronos → Chronos Logs**

Features:
- Log volume by level (time series)
- Total/Error/Warning/Info counts
- Searchable log viewer
- Service filter dropdown

## Retention

Logs are retained for 30 days by default. Modify `loki-config.yml` to change:

```yaml
limits_config:
  retention_period: 24h  # 1 day
```

## Troubleshooting

### No logs appearing in Grafana

1. Check Alloy is running: `docker compose logs alloy`
2. Verify Alloy UI at http://localhost:12345 shows targets
3. Check Loki is receiving logs: `curl http://localhost:3100/ready`

### Alloy can't access Docker socket

Ensure the Docker socket is mounted:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

On some systems (SELinux), you may need:
```bash
sudo chcon -Rt svirt_sandbox_file_t /var/run/docker.sock
```

Start the full stack:                                                                                                                             
  cd chronos_app/docker                                                                                                                             
  docker compose -f docker-compose.yml -f observability/docker-compose-observability.yml up -d                                              
                                                                                                                                                    
  Access:                                                                                                                                           
  ┌──────────┬─────────────────────────────────────┐                                                                                                
  │ Service  │                 URL                 │                                                                                                
  ├──────────┼─────────────────────────────────────┤                                                                                                
  │ Grafana  │ http://localhost:3000 (admin/admin) │                                                                                                
  ├──────────┼─────────────────────────────────────┤                                                                                                
  │ Alloy UI │ http://localhost:12345              │                                                                                                
  ├──────────┼─────────────────────────────────────┤                                                                                                
  │ Loki API │ http://localhost:3100               │                                                                                                
  └──────────┴─────────────────────────────────────┘                                                                                                
  How It Works                                                                                                                                      
                                                                                                                                                    
  1. Alloy discovers running Docker containers via the Docker socket                                                                                
  2. Alloy reads container logs from /var/lib/docker/containers/                                                                                    
  3. Alloy extracts labels (service name, container, image) and parses JSON logs                                                                    
  4. Alloy forwards logs to Loki                                                                                                                    
  5. Grafana queries Loki and displays in the pre-built dashboard                                                                                   
                                                                                                                                                    
  The dashboard includes log volume charts, error/warning/info counts, and a searchable log viewer with service filtering.
                        