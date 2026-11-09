/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

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
    plugins: [
      react(),
      // PWA instalável (#31, ADR-0015): gera o manifest e o service worker no `npm run build`.
      // No `npm run dev` o service worker fica desligado; para testar, use build + preview.
      VitePWA({
        // Service worker escrito por nós (src/sw.ts), para o envio da fila em segundo plano
        // (#100, ADR-0019). O plugin só coloca nele a lista de arquivos da casca.
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        // Versão nova não entra sozinha: o app mostra um aviso e a pessoa toca em "Atualizar"
        // (src/pwa/AvisoDeAtualizacao.tsx). Assim a página não recarrega no meio de um lançamento.
        registerType: 'prompt',
        // O registro é feito pelo próprio app (useRegisterSW), não por um script injetado.
        injectRegister: false,
        // Os ícones do manifest já entram no cache sozinhos; este é o do iPhone (index.html).
        includeAssets: ['apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Easy Finance',
          short_name: 'Easy Finance',
          description: 'Registre receitas e despesas em segundos.',
          lang: 'pt-BR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          // Cores da paleta Champagne (provisória, como o tema).
          background_color: '#fff9ef',
          theme_color: '#fff9ef',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        injectManifest: {
          // Guarda no aparelho só a "casca" do app (HTML, JS, CSS e ícones). Respostas da API
          // NUNCA são guardadas: dados financeiros não ficam no cache do celular (ADR-0015). O
          // fallback de navegação e a regra que exclui /api estão no próprio src/sw.ts.
          globPatterns: ['**/*.{js,css,html,svg}'],
        },
      }),
    ],
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
      // Navegador falso (jsdom) para os testes de tela: o React desenha os componentes nele e o
      // Testing Library procura e clica nos elementos como uma pessoa faria (#33).
      environment: 'jsdom',
      // O módulo do service worker é trocado por um falso nos testes (src/testes/pwaFalso.ts).
      alias: {
        'virtual:pwa-register/react': fileURLToPath(
          new URL('./src/testes/pwaFalso.ts', import.meta.url),
        ),
      },
      setupFiles: ['src/testes/configuracao.ts'],
      passWithNoTests: true,
    },
  }
})
