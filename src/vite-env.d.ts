/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public Congress.gov key (embedded in bundle — see .env.example warning). */
  readonly VITE_CONGRESS_API_KEY?: string;
  /** Absolute base URL of a deployed serverless proxy. */
  readonly VITE_API_BASE?: string;
  /** "1" to render from bundled fixtures instead of the live roster. */
  readonly VITE_USE_FIXTURES?: string;
  /** Base path for the built site (defaults to "/"). */
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
