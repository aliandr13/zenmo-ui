/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API base URL, or `relative` for same-origin /api (Caddy proxy in Docker). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
