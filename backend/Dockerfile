# syntax=docker/dockerfile:1

# ----------- Base image -----------
    FROM python:3.11-slim AS base
    WORKDIR /app
    
    # ----------- Builder stage -----------
    FROM base AS builder
    
    # [CRÍTICO] Instalamos dependencias de compilación
    # build-essential & python3-dev: Para compilar extensiones de C
    # libffi-dev: Para bcrypt (seguridad/passwords)
    # libpq-dev: Para psycopg2 (base de datos Postgres)
    RUN apt-get update && apt-get install -y \
        build-essential \
        libffi-dev \
        libpq-dev \
        python3-dev \
        && rm -rf /var/lib/apt/lists/*
    
    # Copy only requirements.txt first for better caching
    COPY --link requirements.txt ./
    
    # Create virtual environment and install dependencies using pip cache
    RUN --mount=type=cache,target=/root/.cache/pip \
        python -m venv .venv && \
        .venv/bin/pip install --upgrade pip && \
        .venv/bin/pip install -r requirements.txt
    
    # Copy the rest of the backend code
    COPY --link . ./
    
    # ----------- Final stage -----------
    FROM base AS final
    
    # [CRÍTICO] Instalamos dependencias de ejecución (Runtime)
    # Estas son necesarias para que las librerías compiladas arriba funcionen al arrancar
    RUN apt-get update && apt-get install -y \
        libffi-dev \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*
    
    # Create a non-root user for security
    RUN useradd -m appuser
    
    WORKDIR /app
    
    # Copy the virtual environment and code from builder
    COPY --from=builder /app/.venv /app/.venv
    COPY --from=builder /app /app
    COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh
    
    # Create backup of .venv
    RUN cp -r /app/.venv /opt/.venv_backup
    
    # Set PATH to use the virtual environment
    ENV PATH="/app/.venv/bin:$PATH"
    
    # Change ownership
    RUN chown -R appuser:appuser /app && \
        chown -R appuser:appuser /opt/.venv_backup && \
        chmod +x /app/entrypoint.sh
    
    # Switch to non-root user
    USER appuser
    
    # Expose the default port
    EXPOSE 8000
    
    # Entrypoint
    ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
    
    # Default command
    CMD ["/app/.venv/bin/uvicorn", "main_clean_english:app", "--host", "0.0.0.0", "--port", "8000"]