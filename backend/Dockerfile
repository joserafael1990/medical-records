# syntax=docker/dockerfile:1

# Usamos slim para tener control total de lo que instalamos
FROM python:3.11-slim AS base
WORKDIR /app

# ----------- Builder stage -----------
FROM base AS builder

# Accept build args that Coolify might pass (even though we don't use them at build time)
# These are runtime secrets, but Coolify passes them as build args
ARG META_WHATSAPP_VERIFY_TOKEN
ARG META_WHATSAPP_TOKEN
ARG META_WHATSAPP_APP_SECRET
ARG SECRET_KEY
ARG JWT_SECRET_KEY
ARG SENTRY_DSN_BACKEND
ARG DATABASE_URL
ARG MEDICAL_ENCRYPTION_KEY

# Instalar dependencias para COMPILAR (gcc, etc) + Image processing libraries for Pillow
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    python3-dev \
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN python -m venv .venv && \
    .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r requirements.txt

COPY . ./

# ----------- Final stage -----------
FROM base AS final

# [CRÍTICO] Instalar librerías para EJECUTAR
# Aquí es donde estaba el error. El sistema final necesita libffi para leer bcrypt.
RUN apt-get update && apt-get install -y \
    libffi-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m appuser
WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app /app
COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh

RUN cp -r /app/.venv /opt/.venv_backup
ENV PATH="/app/.venv/bin:$PATH"

RUN chown -R appuser:appuser /app && \
    chown -R appuser:appuser /opt/.venv_backup && \
    chmod +x /app/entrypoint.sh

USER appuser
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
CMD ["/app/.venv/bin/uvicorn", "main_clean_english:app", "--host", "0.0.0.0", "--port", "8080"]