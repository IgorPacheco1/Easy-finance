/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Lê o .env.local (se existir) para permitir trocar o alvo do proxy sem mexer neste arquivo.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
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
