# --- build ---
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# API URL is baked in at build time (Vite). Echo ties this layer to ARG so BuildKit
# cannot reuse a cached build from a different VITE_API_URL (e.g. localhost).
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
RUN echo "Vite build VITE_API_URL=$VITE_API_URL" && npm run build

# --- run ---
FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
