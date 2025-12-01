# syntax=docker/dockerfile:1

# ----------- Base image -----------
    FROM python:3.11-slim AS base
    WORKDIR /app
    
    # ----------- Builder stage -----------
    FROM base AS builder
    
    # [NUEVO] Instalar herramientas de compilación (GCC, libffi)
    # Esto es necesario para que 'pip' pueda construir bcrypt y otras librerías C
    RUN apt-get update && apt-get install -y \
        build-essential \
        libffi-dev \
        python3-dev \
        && rm -rf /var/lib/apt/lists/*
    
    # Copy only requirements.txt first for better caching
    COPY --link requirements.txt ./
    
    # Create virtual environment and install dependencies using pip cache
    RUN --mount=type=cache,target=/root/.cache/pip \
        python -m venv .venv && \
        .venv/bin/pip install --upgrade pip && \
        .venv/bin/pip install -r requirements.txt
    
    # Copy the rest of the backend code (excluding secrets, git, IDE files)
    COPY --link . ./
    
    # (Omitido) Validación de sintaxis para acelerar builds en MVP
    
    # ----------- Final stage -----------
    FROM base AS final
    
    # [NUEVO] Instalar librerías de sistema para ejecución (Runtime)
    # Esto soluciona el error: "cannot open shared object file"
    RUN apt-get update && apt-get install -y \
        libffi-dev \
        && rm -rf /var/lib/apt/lists/*
    
    # Create a non-root user for security
    RUN useradd -m appuser
    
    WORKDIR /app
    
    # Copy the virtual environment from builder
    COPY --from=builder /app/.venv /app/.venv
    # Copy the backend code from builder
    COPY --from=builder /app /app
    
    # Copy entrypoint script and make it executable
    COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh
    
    # Create backup of .venv in a location that won't be mounted (as root)
    RUN cp -r /app/.venv /opt/.venv_backup
    
    # Set PATH to use the virtual environment
    ENV PATH="/app/.venv/bin:$PATH"
    
    # Change ownership to appuser (including backup for restoration)
    RUN chown -R appuser:appuser /app && \
        chown -R appuser:appuser /opt/.venv_backup && \
        chmod +x /app/entrypoint.sh
    
    # Switch to non-root user
    USER appuser
    
    # Expose the default port (FastAPI default is 8000)
    EXPOSE 8000
    
    # Use entrypoint script to preserve .venv when volumes mount
    # Use sh to execute script to avoid permission issues when volume mounts
    ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
    
    # Default command: run the FastAPI app
    CMD ["/app/.venv/bin/uvicorn", "main_clean_english:app", "--host", "0.0.0.0", "--port", "8000"]