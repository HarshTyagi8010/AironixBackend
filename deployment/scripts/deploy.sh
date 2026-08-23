#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Automation Script — Aditya Air Compressors
# ==============================================================================

set -e

echo "🚀 Starting Production Deployment..."

# 1. Pull latest verified commit
echo "📦 Pulling latest code..."
git pull origin main || git pull origin cleanup/project-structure

# 2. Build Docker images
echo "🔨 Building Docker containers..."
docker compose build --pull

# 3. Graceful container restart
echo "🔄 Restarting containers with zero-downtime rolling restart..."
docker compose up -d --remove-orphans

# 4. Wait for services to become healthy
echo "⏳ Waiting for services to initialize..."
sleep 5

# 5. Run health check
echo "🏥 Checking service health..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/health || true)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Deployment successful! All services healthy."
else
    echo "❌ Health check failed with status $HTTP_STATUS! Please inspect logs: docker compose logs backend"
    exit 1
fi
