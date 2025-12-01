# syntax=docker/dockerfile:1

# [CAMBIO CRÍTICO] Usamos la imagen completa (no slim) para garantizar compatibilidad
FROM python:3.11 AS base
WORKDIR /app

# ----------- Builder stage -----------
FROM base AS builder

# Nota: Ya no necesitamos apt-get install aquí porque python:3.11 trae todo.

COPY --link requirements.txt ./

# Instalar dependencias
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m venv .venv && \
    .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r requirements.txt

COPY --link . ./

# ----------- Final stage -----------
FROM base AS final

# Crear usuario
RUN useradd -m appuser
WORKDIR /app

# Copiar entorno virtual y código
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app /app
COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh

# Backup y Permisos
RUN cp -r /app/.venv /opt/.venv_backup
ENV PATH="/app/.venv/bin:$PATH"

RUN chown -R appuser:appuser /app && \
    chown -R appuser:appuser /opt/.venv_backup && \
    chmod +x /app/entrypoint.sh

# Usuario y Puerto
USER appuser
EXPOSE 8000

# Arranque
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
CMD ["/app/.venv/bin/uvicorn", "main_clean_english:app", "--host", "0.0.0.0", "--port", "8000"]