# Deployment

Deploy your Kelvin app to production.

## Overview

A Kelvin app is a standard Node.js application. You can deploy it anywhere that runs Node.js:

- Docker containers
- Platform-as-a-Service (Fly.io, Railway, Render)
- Virtual private servers
- Serverless (with modifications)

## Docker

### Dockerfile

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install Kelvin
RUN npm install -g kelvin-lang

# Copy your app
COPY myapp.kelvin .
COPY triggers/ ./triggers/

# Expose port
EXPOSE 3000

# Run the server
CMD ["kelvin", "serve", "myapp.kelvin", "--port", "3000"]
```

### Build and Run

```bash
# Build the image
docker build -t myapp .

# Run locally
docker run -p 3000:3000 -v $(pwd)/data:/app myapp
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
```

## Fly.io

### fly.toml

```toml
app = "myapp"
primary_region = "lhr"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true

[mounts]
  source = "data"
  destination = "/app/data"

[env]
  NODE_ENV = "production"
```

### Deploy

```bash
# First time
fly launch

# Subsequent deploys
fly deploy

# Create persistent volume
fly volumes create data --size 1
```

## Railway

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "kelvin serve myapp.kelvin --port $PORT",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

## Render

### render.yaml

```yaml
services:
  - type: web
    name: myapp
    env: node
    buildCommand: npm install -g kelvin-lang
    startCommand: kelvin serve myapp.kelvin --port $PORT
    disk:
      name: data
      mountPath: /app/data
      sizeGB: 1
```

## Environment Variables

Common environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `JWT_SECRET` | Token signing key | `your-secret-key` |
| `DATABASE_PATH` | Custom DB location | `/app/data/myapp.db` |

## Production Checklist

### Security

- [ ] Set a strong `JWT_SECRET`
- [ ] Use HTTPS (most platforms handle this)
- [ ] Don't expose the database file publicly
- [ ] Review visibility settings on views

### Data

- [ ] Use persistent storage for SQLite
- [ ] Set up regular backups
- [ ] Test restore process

### Performance

- [ ] Consider SQLite write limits for high traffic
- [ ] Use a reverse proxy (nginx) for static assets
- [ ] Enable gzip compression

### Monitoring

- [ ] Set up health checks
- [ ] Configure logging
- [ ] Set up error alerting

## Backup Strategy

### Simple Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/app/data/myapp.db"
BACKUP_PATH="/backups/myapp_$DATE.db"

# Copy the database
cp "$DB_PATH" "$BACKUP_PATH"

# Compress
gzip "$BACKUP_PATH"

# Keep only last 7 days
find /backups -name "myapp_*.db.gz" -mtime +7 -delete
```

### Automated Backups with Cron

```bash
# Run daily at 3 AM
0 3 * * * /app/backup.sh
```

## Database Considerations

SQLite works great for:
- Low to medium traffic (hundreds of requests/second)
- Single-server deployments
- Applications with more reads than writes

For higher scale, PostgreSQL support is planned.

## Health Check Endpoint

Most platforms need a health check. Kelvin provides one at:

```
GET /health
```

Response:

```json
{"status": "ok"}
```

Configure your platform to check this endpoint.

## Related

- [CLI Reference](/reference/cli) — Server options
- [Authentication](/concepts/authentication) — Security setup
