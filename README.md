# Zenmo UI

Vue 3 front-end for [Zenmo](https://github.com/aliandr13/zenmo) — spending and credit card tracking. Uses the Zenmo REST API with JWT authentication.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure API URL** (optional)

   Copy `.env.example` to `.env` and set `VITE_API_URL` if your backend is not at `http://localhost:8080`. For an nginx setup that proxies `/api` on the same host, use `VITE_API_URL=relative` in the **production build** (see Docker below).

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

The `Dockerfile` is a two-stage build: **Node 22** runs `npm ci` and `npm run build`; **nginx 1.27** serves the static `dist` output with SPA routing (`try_files` → `index.html`), gzip, and caches hashed assets. **nginx also reverse-proxies `/api/`** to the Compose service `api:8080` so the browser can use one origin on port 80.

`VITE_API_URL` is a **build-time** argument (Vite embeds it in the bundle). Change it only by rebuilding the image.

- **`relative`** — same-origin requests to `/api/...` (use with the nginx proxy above).
- **Absolute URL** — e.g. `https://api.example.com` when the API is on another host (no proxy).

### Build and run locally

```bash
# default API URL in the bundle: http://localhost:8080
docker build -t zenmo-ui .

# same-origin /api via nginx (typical full-stack Compose)
docker build -t zenmo-ui --build-arg VITE_API_URL=relative .

# split host: point the SPA at another API
docker build -t zenmo-ui --build-arg VITE_API_URL=https://api.example.com .

docker run --rm -p 8080:80 zenmo-ui
```

### Monorepo stack (Zenmo root)

The root [`docker-compose.yml`](https://github.com/aliandr13/zenmo) builds this UI with **`VITE_API_URL=relative`** by default, maps **`HTTP_PORT`** (default **80**) to nginx, and keeps the API **internal** (reachable only via `/api` on that port). Override the build arg if you do not use the bundled proxy:

```bash
HTTP_PORT=8080 docker compose up --build
```

## GitHub Actions and GHCR

On every push to **`main`**, [.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml) builds the image and pushes it to **GitHub Container Registry**:

- `ghcr.io/<lowercase-owner>/zenmo-ui:latest`
- `ghcr.io/<lowercase-owner>/zenmo-ui:<git-sha>`

Configure a repository **Actions variable** `VITE_API_URL` (Settings → Secrets and variables → Actions → Variables): set **`relative`** if production serves this image behind nginx that proxies `/api` to the backend; otherwise set the full API base URL (e.g. `https://api.example.com`). If unset, the workflow uses `http://localhost:8080` (pipeline smoke tests only).

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
