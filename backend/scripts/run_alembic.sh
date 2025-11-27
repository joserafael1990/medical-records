#!/bin/bash
# Helper script to run Alembic commands in Docker container
# Usage: ./scripts/run_alembic.sh <alembic_command>
# Example: ./scripts/run_alembic.sh upgrade head
# Example: ./scripts/run_alembic.sh revision --autogenerate -m "add new field"

set -e

# Get the command and arguments
ALEMBIC_CMD="$@"

if [ -z "$ALEMBIC_CMD" ]; then
    echo "Usage: $0 <alembic_command>"
    echo "Examples:"
    echo "  $0 upgrade head"
    echo "  $0 revision --autogenerate -m 'add new field'"
    echo "  $0 current"
    echo "  $0 history"
    exit 1
fi

# Check if we're in Docker or need to use docker compose
if [ -f "/.dockerenv" ]; then
    # We're inside Docker, run directly using wrapper
    echo "🔧 Running Alembic: $ALEMBIC_CMD"
    python /app/scripts/alembic_wrapper.py $ALEMBIC_CMD
else
    # We're outside Docker, use docker compose
    echo "🔧 Running Alembic in Docker: $ALEMBIC_CMD"
    docker compose exec python-backend python /app/scripts/alembic_wrapper.py $ALEMBIC_CMD
fi

