#!/bin/bash

echo "🛑 Stopping frontend container..."
docker stop medical-records-main-typescript-frontend-1

echo "🗑️ Removing frontend container..."
docker rm medical-records-main-typescript-frontend-1

echo "🧹 Removing node_modules and build cache from frontend..."
rm -rf frontend/node_modules
rm -rf frontend/.cache
rm -rf frontend/build

echo "🧹 Pruning Docker build cache..."
docker builder prune -f

echo "🔨 Rebuilding frontend image without cache..."
docker-compose build --no-cache typescript-frontend

echo "🚀 Starting frontend container..."
docker-compose up -d typescript-frontend

echo "✅ Frontend container restarted! Waiting 40 seconds for npm install and compilation..."
sleep 40

echo "📊 Checking frontend logs..."
docker logs medical-records-main-typescript-frontend-1 --tail 30



