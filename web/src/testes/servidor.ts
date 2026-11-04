import { setupServer } from 'msw/node'

/**
 * Servidor falso da API para os testes (MSW). Ele intercepta os pedidos do fetch antes de
 * saírem para a rede; cada teste diz o que ele responde com `servidor.use(...)`.
 */
export const servidor = setupServer()

/** Mesmo endereço configurado em vite.config.ts (test.env.VITE_API_URL). */
export const API = 'http://localhost/api/v1'
