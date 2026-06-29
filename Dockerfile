# Multi-stage build to compile better-sqlite3 native bindings
FROM node:20-slim AS builder

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    gcc \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Final stage
FROM node:20-slim

WORKDIR /app

# Install sqlite3 runtime dependency
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Expose port (Fly.io will route to this)
EXPOSE 8080

# Run the app
CMD ["node", "app.js"]
