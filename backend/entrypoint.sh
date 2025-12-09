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

# Check if Google Calendar dependencies are installed
if ! /app/.venv/bin/python -c "from google.oauth2.credentials import Credentials" 2>/dev/null; then
    echo "⚠️  Google Calendar dependencies not found, installing..."
    /app/.venv/bin/pip install --quiet --no-cache-dir \
        google-auth==2.23.4 \
        google-auth-oauthlib==1.1.0 \
        google-auth-httplib2==0.1.1 \
        google-api-python-client==2.108.0
    if [ $? -eq 0 ]; then
        echo "✅ Google Calendar dependencies installed"
    else
        echo "❌ Failed to install Google Calendar dependencies"
    fi
fi

# CRITICAL: Ensure appointment_reminders table exists BEFORE running migrations
# This guarantees the table exists even if migrations fail
echo "🔧 Ensuring appointment_reminders table exists..."
/app/.venv/bin/python /app/scripts/ensure_appointment_reminders_table.py || echo "⚠️  Could not ensure table (will try in migration)"

# Run Alembic migrations automatically on startup (only if not explicitly disabled)
if [ "${SKIP_ALEMBIC_MIGRATIONS:-false}" != "true" ]; then
    echo "🔄 Running Alembic migrations..."
    if /app/.venv/bin/python /app/scripts/alembic_wrapper.py upgrade head; then
        echo "✅ Alembic migrations completed"
    else
        echo "⚠️  Alembic migrations failed (non-critical, continuing anyway)"
        echo "💡 You can run migrations manually with: python scripts/alembic_wrapper.py upgrade head"
    fi
else
    echo "⏭️  Skipping Alembic migrations (SKIP_ALEMBIC_MIGRATIONS=true)"
fi

# Execute the original command
exec "$@"

