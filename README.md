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

## Stack

- Vue 3 (Composition API) + TypeScript
- Vite
- Vue Router (auth guard for protected routes)
- Pinia (auth store)
- API client with token refresh on 401
