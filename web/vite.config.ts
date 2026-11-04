/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Lê o .env.local (se existir) para permitir trocar o alvo do proxy e ligar o HTTPS sem mexer
  // neste arquivo.
  const env = loadEnv(mode, process.cwd(), '')

  // HTTPS só no desenvolvimento e só quando o certificado é informado no .env.local
  // (HTTPS_CERTIFICADO e HTTPS_CHAVE). Serve para testar no celular: PWA e service worker só
  // funcionam em endereço seguro. Passo a passo em docs/guias/celular-com-https.md.
  const https =
    env.HTTPS_CERTIFICADO && env.HTTPS_CHAVE
      ? {
          cert: readFileSync(env.HTTPS_CERTIFICADO),
          key: readFileSync(env.HTTPS_CHAVE),
        }
      : undefined

  return {
    plugins: [react()],
    server: {
      https,
      proxy: {
        // No `npm run dev`, tudo que começa com /api é repassado para o backend. Para o
        // navegador, app e API estão no mesmo endereço (localhost:5173): não há CORS.
        '/api': env.API_PROXY_ALVO || 'http://localhost:8080',
      },
    },
    test: {
      // Nos testes não existe navegador nem proxy: o fetch precisa de um endereço completo.
      // O MSW intercepta os pedidos para este endereço (src/testes/servidor.ts).
      env: { VITE_API_URL: 'http://localhost/api/v1' },
      setupFiles: ['src/testes/configuracao.ts'],
      passWithNoTests: true,
    },
  }
})
