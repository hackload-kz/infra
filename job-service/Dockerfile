# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better cache layers
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

# Production stage  
FROM node:18-alpine AS production

# Install security updates and create user
RUN apk update && apk upgrade && \
    addgroup -g 1001 -S nodejs && \
    adduser -S jobservice -u 1001 -G nodejs

WORKDIR /app

# Copy production files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Create necessary directories and set permissions
RUN mkdir -p /tmp && \
    chown -R jobservice:nodejs /app /tmp

# Switch to non-root user
USER jobservice

# Set NODE_ENV
ENV NODE_ENV=production

# Health check using native Node.js (without fetch polyfill for older versions)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');const req=http.request({hostname:'localhost',port:8080,path:'/health/live',timeout:5000},res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.end()"

# Expose ports
EXPOSE 8080 9090

# Use exec form for better signal handling
CMD ["node", "dist/index.js"]