/// <reference types="vite/client" />

/**
 * Typed environment variables read by `config/database.ts`.
 * Every value is optional; defaults live in that module.
 */
interface ImportMetaEnv {
  readonly VITE_DB_ENGINE?: string;
  readonly VITE_DB_HOST?: string;
  readonly VITE_DB_PORT?: string;
  readonly VITE_DB_NAME?: string;
  readonly VITE_DB_SCHEMA?: string;
  readonly VITE_DB_USER?: string;
  readonly VITE_DB_PASSWORD?: string;
  readonly VITE_DB_SSL?: string;
  readonly VITE_DB_SSL_MODE?: string;
  readonly VITE_DB_POOL_MIN?: string;
  readonly VITE_DB_POOL_MAX?: string;
  readonly VITE_DB_CONNECT_TIMEOUT_MS?: string;
  readonly VITE_DB_IDLE_TIMEOUT_MS?: string;
  readonly VITE_DB_SSL_CA_PATH?: string;
  readonly VITE_IDB_NAME?: string;
  readonly VITE_IDB_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
