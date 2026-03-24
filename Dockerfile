# =============================================================================
# VaultGate — Multi-stage production build
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Add a non-root user for security
RUN addgroup -g 1001 -S vaultgate && adduser -S vaultgate -u 1001

COPY --from=builder --chown=vaultgate:vaultgate /app/dist ./dist
COPY --from=builder --chown=vaultgate:vaultgate /app/node_modules ./node_modules
COPY --from=builder --chown=vaultgate:vaultgate /app/package.json ./package.json

# Copy demo assets
COPY --chown=vaultgate:vaultgate demo ./demo
COPY --chown=vaultgate:vaultgate demo-try.sh ./demo-try.sh

USER vaultgate

ENV NODE_ENV=production
ENV PORT=18792
ENV HOST=0.0.0.0

EXPOSE 18792

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:18792/health || exit 1

ENTRYPOINT ["node", "dist/index.js"]
