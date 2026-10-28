# StorageBox API — multi-stage build, published as ghcr.io/udenis123/storagebox-api
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm \
    npm ci --fetch-timeout=120000 --fetch-retries=10

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build \
  && npx prisma generate \
  && npm prune --omit=dev \
  && npm install prisma@6.19.3 --omit=dev --no-audit --no-fund

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=4200
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 10001 storagebox \
  && adduser --system --uid 10001 --ingroup storagebox storagebox

COPY --from=build --chown=storagebox:storagebox /app/node_modules ./node_modules
COPY --from=build --chown=storagebox:storagebox /app/dist ./dist
COPY --from=build --chown=storagebox:storagebox /app/prisma ./prisma
COPY --from=build --chown=storagebox:storagebox /app/package.json ./package.json
COPY --chown=storagebox:storagebox docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/logs \
  && chown storagebox:storagebox /app/logs

USER storagebox
EXPOSE 4200

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4200/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
