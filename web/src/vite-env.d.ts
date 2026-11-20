/// <reference types="vite-plugin-pwa/react" />

/** Variáveis de ambiente que o app lê (definidas em web/.env.local; modelo em web/.env.example). */
interface ImportMetaEnv {
  /** Endereço base da API. Padrão: "/api/v1", que no desenvolvimento passa pelo proxy do Vite. */
  readonly VITE_API_URL?: string
}

/** Versão do app (do package.json), colocada no código pelo Vite no build (#194). */
declare const __VERSAO_DO_APP__: string
