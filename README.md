# Zenmo UI

Vue 3 front-end for [Zenmo](https://github.com/aliandr13/zenmo) — spending and credit card tracking. Uses the Zenmo REST API with JWT authentication.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure API URL** (optional)

   Copy `.env.example` to `.env` and set `VITE_API_URL` if your backend is not at `http://localhost:8080`. For a setup that proxies `/api` on the same host (Caddy in the Docker image), use `VITE_API_URL=relative` in the **production build** (see Docker below).

3. **Run the Zenmo backend**

   See the [Zenmo README](https://github.com/aliandr13/zenmo) for database setup and `mvn spring-boot:run`.

## Develop

```bash
npm run dev
```

Open the URL shown (e.g. http://localhost:5173). Register or log in, then use Dashboard, Accounts, Transactions, and Categories.

## Build

```bash
npm run build
npm run preview   # preview production build
```

## Docker

The `Dockerfile` is a two-stage build: **Node 22** runs `npm ci` and `npm run build`; **Caddy 2** serves the static `dist` output from `/srv` with SPA routing (`try_files` → `index.html`), `encode gzip`, cache headers for common static extensions, and **reverse-proxies `/api/*`** to the Compose service `api:8080` so the browser can use one origin.

- Default config ([`caddy/Caddyfile`](caddy/Caddyfile)): **HTTP on port 80** only (good for local Compose).
- Production example ([`caddy/Caddyfile.production`](caddy/Caddyfile.production)): **HTTPS** for `zenmo.fyi` with **Let’s Encrypt** (automatic). Mount it over `/etc/caddy/Caddyfile` on the container, publish **443**, open firewall **80** and **443**, and set **`CADDY_ACME_EMAIL`** for ACME account contact (recommended). Certificate and renewal state persist in Caddy’s **`/data`** volume (the root [`docker-compose.yml`](../docker-compose.yml) mounts **`caddy_data`** there).

`VITE_API_URL` is a **build-time** argument (Vite embeds it in the bundle). Change it only by rebuilding the image.

- **`relative`** — same-origin requests to `/api/...` (use with the Caddy proxy above).
- **Absolute URL** — e.g. `https://api.example.com` when the API is on another host (no proxy).

### Build and run locally

```bash
# default API URL in the bundle: http://localhost:8080
docker build -t zenmo-ui .

# same-origin /api via Caddy (typical full-stack Compose)
docker build -t zenmo-ui --build-arg VITE_API_URL=relative .

# split host: point the SPA at another API
docker build -t zenmo-ui --build-arg VITE_API_URL=https://api.example.com .

docker run --rm -p 8080:80 zenmo-ui
```

### Monorepo stack (Zenmo root)

The root [`docker-compose.yml`](../docker-compose.yml) runs the **zenmo-ui** image from GHCR. For same-origin `/api`, that image must be built with **`VITE_API_URL=relative`** (see the Actions variable above). Compose maps **`HTTP_PORT`** (default **80**) and **`HTTPS_PORT`** (default **443**) to Caddy and keeps the API **internal** (reachable only via `/api` on the UI ports). Override the build arg when building the image if you do not use the bundled proxy:

```bash
HTTP_PORT=8080 docker compose up --build
```

**HTTPS in production:** add a volume mount so the active config is the production file, and set your email, for example:

```yaml
# under ui.volumes:
#   - ./zenmo-ui/caddy/Caddyfile.production:/etc/caddy/Caddyfile:ro
```

```bash
CADDY_ACME_EMAIL=you@domain.tld docker compose up -d
```

## GitHub Actions and GHCR

On every push to **`main`**, [.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml) builds the image and pushes it to **GitHub Container Registry**:

- `ghcr.io/<lowercase-owner>/zenmo-ui:latest`
- `ghcr.io/<lowercase-owner>/zenmo-ui:<git-sha>`

Configure a repository **Actions variable** `VITE_API_URL` (Settings → Secrets and variables → Actions → Variables): set **`relative`** if production serves this image with Caddy proxying `/api` to the backend; otherwise set the full API base URL (e.g. `https://api.example.com`). If unset, the workflow uses `http://localhost:8080` (pipeline smoke tests only).

Log in to GHCR and run a published image:

```bash
echo <GITHUB_PAT> | docker login ghcr.io -u <github-username> --password-stdin
docker run --rm -p 3000:80 ghcr.io/<owner>/zenmo-ui:latest
```

## Stack

- Vue 3 (Composition API) + TypeScript
- Vite
- Vue Router (auth guard for protected routes)
- Pinia (auth store)
- API client with token refresh on 401
