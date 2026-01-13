# Chronos Docker

```bash
docker compose up -d
docker compose stop
docker compose remove
```

## Env Variables

If you like to persist your data (flows, logs, credentials, storage), set these variables in the `.env` file inside `docker` folder:

```bash
# see .env.example for enviroenment variables reference
DATABASE_PATH=/root/.chronos
LOG_PATH=/root/.chronos/logs
SECRETKEY_PATH=/root/.chronos
BLOB_STORAGE_PATH=/root/.chronos/storage
```

See the main [Readme](../readme.md) for the project.
