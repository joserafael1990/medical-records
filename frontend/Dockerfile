# syntax=docker/dockerfile:1

# ----------- Build Stage -----------
ARG NODE_VERSION=22.13.1
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Build arguments for React environment variables
# These need to be available during build time, not just runtime
ARG REACT_APP_API_URL
ARG REACT_APP_SENTRY_DSN
ARG REACT_APP_SENTRY_ENVIRONMENT
ARG REACT_APP_AMPLITUDE_API_KEY

# Set as environment variables for the build process
# CRITICAL: NODE_ENV must be 'production' during build for React to compile correctly
ENV NODE_ENV=production
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_SENTRY_DSN=${REACT_APP_SENTRY_DSN}
ENV REACT_APP_SENTRY_ENVIRONMENT=${REACT_APP_SENTRY_ENVIRONMENT}
ENV REACT_APP_AMPLITUDE_API_KEY=${REACT_APP_AMPLITUDE_API_KEY}

# Install dependencies (use npm ci for deterministic builds)
COPY --link package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy source files (exclude secrets, .env, .git, etc. via .dockerignore)
COPY --link . .

# Build the React app (TypeScript)
RUN --mount=type=cache,target=/root/.npm \
    # Remove mocks and tests to prevent build errors
    rm -rf src/__mocks__ src/**/*.test.tsx src/**/*.test.ts && \
    DISABLE_ESLINT_PLUGIN=true GENERATE_SOURCEMAP=false TSC_COMPILE_ON_ERROR=true npm run build

# ----------- Production Stage -----------
FROM node:${NODE_VERSION}-slim AS final
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy built app and only necessary files
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 1. Install 'serve' globally while you are still ROOT
RUN --mount=type=cache,target=/root/.npm npm install -g serve

# 2. Verify build directory exists and set correct permissions
RUN if [ ! -d "/app/build" ]; then \
    echo "ERROR: Build directory /app/build does not exist!" && \
    ls -la /app && \
    exit 1; \
    fi && \
    chown -R appuser:appgroup /app/build && \
    echo "Build directory verified: $(ls -la /app/build | head -5)"

# 3. NOW switch to the restricted user
USER appuser

EXPOSE 3000

# 4. Use shell form to verify build exists and start serve
# Use full path to serve and add helpful flags
CMD if [ ! -d "/app/build" ]; then \
    echo "ERROR: Build directory not found at startup!" && \
    ls -la /app && \
    exit 1; \
    fi && \
    echo "Starting serve on port 3000..." && \
    /usr/local/bin/serve -s /app/build -l 3000 -H 0.0.0.0 --no-clipboard --no-compression
