#!/bin/bash
# Script for local development using .env file
# Usage: ./scripts/dev.sh [up|down|build|logs|...]
# Make sure you have a .env file in the project root (copy from .env.example)

set -e

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Create it by copying .env.example:"
    echo "   cp .env.example .env"
    echo "   Then edit .env and fill in your values"
    exit 1
fi

# Verify that Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "   Please start Docker Desktop first"
    exit 1
fi

echo "🚀 Starting local development environment..."
echo "   Using: compose.dev.yaml"
echo "   Environment: .env file"
echo ""

# Execute docker compose with the dev file
docker compose -f compose.dev.yaml "${@:-up}"
