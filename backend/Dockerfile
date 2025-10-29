# syntax=docker/dockerfile:1

# ----------- Base image -----------
FROM python:3.11-slim AS base
WORKDIR /app

# ----------- Builder stage -----------
FROM base AS builder

# Copy only requirements.txt first for better caching
COPY --link requirements.txt ./

# Create virtual environment and install dependencies using pip cache
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m venv .venv && \
    .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r requirements.txt

# Copy the rest of the backend code (excluding secrets, git, IDE files)
COPY --link . ./

# Validate Python syntax before building final image
RUN python validate_syntax.py || (echo "❌ Syntax validation failed!" && exit 1)

# ----------- Final stage -----------
FROM base AS final

# Create a non-root user for security
RUN useradd -m appuser

WORKDIR /app

# Copy the virtual environment from builder
COPY --from=builder /app/.venv /app/.venv
# Copy the backend code from builder
COPY --from=builder /app /app

# Set PATH to use the virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Change ownership to appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the default port (FastAPI default is 8000)
EXPOSE 8000

# Entrypoint: run the FastAPI app
CMD ["/app/.venv/bin/uvicorn", "main_clean_english:app", "--host", "0.0.0.0", "--port", "8000"]
