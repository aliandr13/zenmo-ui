# --- build ---
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# API URL is baked in at build time (Vite). Use `relative` when Caddy proxies /api on the same host.
# Echo ties this layer to ARG so BuildKit cannot reuse a cached build from a different VITE_API_URL.
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
RUN echo "Vite build VITE_API_URL=$VITE_API_URL" && npm run build

# --- run ---
FROM caddy:2-alpine

COPY caddy/Caddyfile /etc/caddy/Caddyfile
COPY caddy/zenmo-app.caddy /etc/caddy/zenmo-app.caddy
COPY --from=build /app/dist /srv

EXPOSE 80 443
