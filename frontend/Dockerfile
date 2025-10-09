# syntax=docker/dockerfile:1

# ----------- Build Stage -----------
ARG NODE_VERSION=22.13.1
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Install dependencies (use npm ci for deterministic builds)
COPY --link package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source files (exclude secrets, .env, .git, etc. via .dockerignore)
COPY --link . .

# Build the React app (TypeScript)
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# ----------- Production Stage -----------
FROM node:${NODE_VERSION}-slim AS final
WORKDIR /app

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy built app and only necessary files
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Use non-root user
USER appuser

# Expose the port Create React App uses
EXPOSE 3000

# Start the app (serves static files)
# For production, use a static file server like 'serve'
RUN --mount=type=cache,target=/root/.npm npm install -g serve
CMD ["serve", "-s", "build", "-l", "3000"]
