/** Variáveis de ambiente que o app lê (definidas em web/.env.local; modelo em web/.env.example). */
interface ImportMetaEnv {
  /** Endereço base da API. Padrão: "/api/v1", que no desenvolvimento passa pelo proxy do Vite. */
  readonly VITE_API_URL?: string
}
