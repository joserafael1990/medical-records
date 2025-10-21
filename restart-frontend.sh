#!/bin/bash

echo "🛑 Stopping frontend container..."
docker stop medical-records-main-typescript-frontend-1

echo "🗑️ Removing frontend container..."
docker rm medical-records-main-typescript-frontend-1

echo "🧹 Pruning Docker build cache..."
docker builder prune -f

echo "🔨 Rebuilding frontend image without cache..."
docker-compose build --no-cache typescript-frontend

echo "🚀 Starting frontend container..."
docker-compose up -d typescript-frontend

echo "✅ Frontend container restarted! Waiting 30 seconds for compilation..."
sleep 30

echo "📊 Checking frontend logs..."
docker logs medical-records-main-typescript-frontend-1 --tail 20



