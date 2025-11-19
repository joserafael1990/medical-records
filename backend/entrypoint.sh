#!/bin/bash
# Entrypoint script to preserve .venv when volumes are mounted
# This script runs every time the container starts, after volumes are mounted

# Always check and restore .venv if needed (volumes may have overwritten it)
# Check if .venv exists and is functional (not just empty directory from host)
RESTORE_VENV=false

if [ ! -d "/app/.venv" ]; then
    echo "⚠️  .venv directory not found"
    RESTORE_VENV=true
elif [ ! -f "/app/.venv/bin/python" ]; then
    echo "⚠️  .venv/bin/python not found"
    RESTORE_VENV=true
elif [ ! -f "/app/.venv/bin/uvicorn" ]; then
    echo "⚠️  .venv/bin/uvicorn not found"
    RESTORE_VENV=true
elif ! /app/.venv/bin/python -c "import uvicorn" 2>/dev/null; then
    echo "⚠️  uvicorn module cannot be imported"
    RESTORE_VENV=true
fi

if [ "$RESTORE_VENV" = true ]; then
    echo "🔄 Restoring .venv from image backup..."
    if [ -d "/opt/.venv_backup" ]; then
        echo "📦 Backup found at /opt/.venv_backup, copying..."
        # Remove existing .venv if it exists but is incomplete
        [ -d "/app/.venv" ] && rm -rf /app/.venv
        if cp -r /opt/.venv_backup /app/.venv; then
            echo "✅ .venv restored from backup"
            # Verify uvicorn can be imported after restoration
            if /app/.venv/bin/python -c "import uvicorn" 2>/dev/null; then
                echo "✅ Verified: uvicorn module can be imported"
            else
                echo "❌ Warning: uvicorn module still cannot be imported after restoration"
                exit 1
            fi
        else
            echo "❌ Failed to copy .venv from backup"
            exit 1
        fi
    else
        echo "❌ No .venv backup found at /opt/.venv_backup"
        exit 1
    fi
else
    echo "✅ .venv already exists and is complete, skipping restoration"
fi

# Execute the original command
exec "$@"

