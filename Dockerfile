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

# Install sqlite3 and ca-certificates runtime dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Litestream
ADD https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.deb /tmp/litestream.deb
RUN dpkg -i /tmp/litestream.deb && rm /tmp/litestream.deb

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Copy Litestream config and make startup script executable
COPY litestream.yml /etc/litestream.yml
RUN chmod +x start.sh

# Expose port
EXPOSE 8080

# Run the app via the startup script
CMD ["./start.sh"]
