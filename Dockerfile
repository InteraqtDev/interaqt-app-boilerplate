# Multi-stage Dockerfile for Lit Application
# Frontend is built in init container at deploy time (to get correct publicUrl)

# Stage 1: Build backend (prepare dependencies)
FROM node:24-slim AS builder

WORKDIR /app

# Use Taobao npm registry for faster downloads in China
RUN npm config set registry https://registry.npmmirror.com

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy backend source files
COPY . .

# Stage 2: Production image
# Using Debian-based image (slim) instead of Alpine for glibc compatibility
# Required by @temporalio/core-bridge native module
FROM node:24-slim

# Install dumb-init and build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Use Taobao npm registry for faster downloads in China
RUN npm config set registry https://registry.npmmirror.com

# Copy package files for root
COPY package*.json ./
COPY tsconfig.json ./

# Copy all workspace directories to ensure npm workspaces can resolve dependencies
# This includes all package.json files from workspaces
COPY integrations/ ./integrations/
COPY frontend/package*.json ./frontend/

# Install production dependencies (including workspace dependencies)
RUN npm ci --only=production

# Copy application source (including frontend source code)
COPY --chown=node:node . .

# Install frontend dependencies including devDependencies
# (vite, @vitejs/plugin-react-swc etc. are devDependencies needed for build)
# Use --include=dev to ensure devDependencies are installed even in production mode
# Clean npm cache first to ensure we download correct platform binaries (linux/amd64)
RUN cd frontend && npm cache clean --force && npm install --include=dev && cd ..

# Create empty app.config.host.json placeholder for static import
# (actual config is in app.config.json, this is only to prevent import error)
RUN echo '{}' > /app/app.config.host.json

# Create frontend/dist placeholder directory
# (actual build will be done in init container with correct config)
RUN mkdir -p frontend/dist

# Create necessary directories
RUN mkdir -p appdb

# Fix permissions for node user
# - frontend directory needs write access for npm install in init container
# - appdb needs write access for SQLite database
# - node_modules needs write access for npm rebuild
RUN chown -R node:node frontend appdb node_modules

# Switch to non-root user
USER node

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application using npm script (decoupled from script filename)
CMD ["npm", "run", "start:main"]
