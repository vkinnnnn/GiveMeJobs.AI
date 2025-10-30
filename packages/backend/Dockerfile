# Multi-stage build for backend
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared-types/package*.json ./packages/shared-types/
RUN npm ci --workspace=@givemejobs/backend --workspace=@givemejobs/shared-types

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@givemejobs/backend

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backend

# Copy built application
COPY --from=builder --chown=backend:nodejs /app/packages/backend/dist ./dist
COPY --from=builder --chown=backend:nodejs /app/packages/backend/package*.json ./
COPY --from=deps --chown=backend:nodejs /app/node_modules ./node_modules

USER backend

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
