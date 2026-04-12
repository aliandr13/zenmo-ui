# Zenmo UI

Vue 3 front-end for [Zenmo](https://github.com/aliandr13/zenmo) — spending and credit card tracking. Uses the Zenmo REST API with JWT authentication.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure API URL** (optional)

   Copy `.env.example` to `.env` and set `VITE_API_URL` if your backend is not at `http://localhost:8080`.

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

The `Dockerfile` is a two-stage build: **Node 22** runs `npm ci` and `npm run build`; **nginx 1.27** serves the static `dist` output with SPA routing (`try_files` → `index.html`), gzip for common types, and short cache headers for hashed assets.

`VITE_API_URL` is a **build-time** argument (Vite embeds it in the bundle). Change it only by rebuilding the image.

### Build and run locally

```bash
# default API URL in the bundle: http://localhost:8080
docker build -t zenmo-ui .

# point the UI at another API (rebuild after changing)
docker build -t zenmo-ui --build-arg VITE_API_URL=https://api.example.com .

docker run --rm -p 3000:80 zenmo-ui
```

### docker-compose (this repo)

`docker-compose.yml` builds the same image and maps the container’s port 80 to the host.

- **`VITE_API_URL`** — passed as a build arg (default `http://localhost:8080`). Set in the environment when you run `docker compose build` so the SPA calls the right API.
- **`HTTP_PORT`** — host port for the UI (default `8080`). If that clashes with another service, override it (e.g. `HTTP_PORT=3000`).

```bash
VITE_API_URL=http://localhost:8080 HTTP_PORT=3000 docker compose up --build
```

For the full stack (Postgres, API, and UI) from the monorepo root, see the root `docker-compose.yml` in [Zenmo](https://github.com/aliandr13/zenmo); it builds this UI with `VITE_API_URL` defaulting to `http://localhost:8080` and exposes the UI on **`UI_PORT`** (default `3000`).

## GitHub Actions and GHCR

On every push to **`main`**, [.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml) builds the image and pushes it to **GitHub Container Registry**:

- `ghcr.io/<lowercase-owner>/zenmo-ui:latest`
- `ghcr.io/<lowercase-owner>/zenmo-ui:<git-sha>`

Configure a repository **Actions variable** `VITE_API_URL` (Settings → Secrets and variables → Actions → Variables) to the public API base URL your deployed UI should use. If it is unset, the workflow uses `http://localhost:8080` (mainly useful for verifying the pipeline, not for real deployments).

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
