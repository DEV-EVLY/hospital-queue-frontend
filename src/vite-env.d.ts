/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Texto del ticker inferior de la cartelera */
  readonly VITE_TICKER_MSG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
