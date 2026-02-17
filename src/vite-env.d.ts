// / <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MEDUSA_ADMIN_BACKEND_URL: string
  readonly VITE_MEDUSA_STOREFRONT_URL: string
  readonly VITE_MEDUSA_V2: "true" | "false"
  /** Sales channel for denne markedsplassen (multi-marketplace). Sendes som X-Sales-Channel-Id til backend. */
  readonly VITE_SALES_CHANNEL_ID?: string
  /** Region for denne markedsplassen (multi-marketplace). Sendes som X-Region-Id til backend. */
  readonly VITE_REGION_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __BACKEND_URL__: string | undefined
declare const __STOREFRONT_URL__: string | undefined
declare const __BASE__: string
declare const __PUBLISHABLE_API_KEY__: string | undefined
declare const __TALK_JS_APP_ID__: string | undefined
declare const __DISABLE_SELLERS_REGISTRATION__: string | undefined
