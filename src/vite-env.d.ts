/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_KEY: string
  readonly VITE_BASE_URL: string
  readonly VITE_USERNAME: string
  readonly VITE_PASSWORD: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
