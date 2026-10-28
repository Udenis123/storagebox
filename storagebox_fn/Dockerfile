# StorageBox dashboard — multi-stage build, published as ghcr.io/udenis123/storagebox-web
FROM node:20-alpine AS build
WORKDIR /app

# Baked into the client bundle at build time (not overridable at container start).
ARG VITE_STORAGEBOX_API_URL=https://storagebox.urbinaryhub.rw
ARG VITE_MAX_UPLOAD_MB=5120
ENV VITE_STORAGEBOX_API_URL=$VITE_STORAGEBOX_API_URL \
    VITE_MAX_UPLOAD_MB=$VITE_MAX_UPLOAD_MB

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --fetch-timeout=120000 --fetch-retries=10

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
