/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { copyFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Só no build da demonstração (#162): coloca no resultado o service worker do MSW (direto do
 * pacote, sempre na versão instalada) e um 404.html igual ao index.html. O GitHub Pages não
 * conhece as rotas do app: um endereço como /Easy-finance/mes cai no 404.html, que abre o app,
 * e o roteador mostra a tela certa.
 */
function arquivosDaDemonstracao(): Plugin {
  const require = createRequire(import.meta.url)
  return {
    name: 'easy-finance-demonstracao',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'mockServiceWorker.js',
        source: readFileSync(
          require.resolve('msw/mockServiceWorker.js'),
          'utf-8',
        ),
      })
    },
    // O index.html só fica pronto no fim do build: a cópia é feita depois de gravar os arquivos.
    writeBundle({ dir }) {
      if (dir) copyFileSync(`${dir}/index.html`, `${dir}/404.html`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `npm run build:demonstracao` (#162): app só no navegador, com a API falsa (MSW) e dados de
  // exemplo, para publicar no GitHub Pages. O caminho (/Easy-finance/) vem do workflow.
  const demonstracao = mode === 'demonstracao'
  const versaoDoApp = (
    JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string }
  ).version

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
    base: demonstracao ? env.BASE_DA_DEMONSTRACAO || '/' : '/',
    // Na demonstração, a API é sempre a do próprio endereço (/api/v1), que o MSW responde. Um
    // VITE_API_URL que estivesse no ambiente nunca chega ao build da demonstração.
    define: {
      // Versão do app, lida do package.json, para a tela Conta mostrar (#194).
      __VERSAO_DO_APP__: JSON.stringify(versaoDoApp),
      ...(demonstracao
        ? { 'import.meta.env.VITE_API_URL': JSON.stringify('/api/v1') }
        : {}),
    },
    resolve: demonstracao
      ? {
          // Sem PWA na demonstração: o registro do service worker do app vira "nada a fazer".
          alias: {
            'virtual:pwa-register/react': fileURLToPath(
              new URL('./src/demonstracao/pwaDesligado.ts', import.meta.url),
            ),
          },
        }
      : {},
    build: demonstracao ? { outDir: 'dist-demonstracao' } : {},
    plugins: [
      react(),
      demonstracao && arquivosDaDemonstracao(),
      // PWA instalável (#31, ADR-0015): gera o manifest e o service worker no `npm run build`.
      // No `npm run dev` o service worker fica desligado; para testar, use build + preview.
      VitePWA({
        // Na demonstração não há PWA (#162): nada de instalar, nem cache que prenda uma versão velha.
        disable: demonstracao,
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
          // Fundo da paleta Guará (ADR-0033): tela de abertura e barra do sistema.
          background_color: '#faf9f7',
          theme_color: '#faf9f7',
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
          // A fonte (Manrope, ADR-0029) também entra, para o app abrir sem conexão com a cara
          // certa; só os alfabetos latinos (português), os outros o navegador nem baixa.
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          globIgnores: [
            '**/*-{cyrillic,cyrillic-ext,greek,vietnamese}-*.woff2',
          ],
        },
      }),
    ],
    server: {
      https,
      proxy: {
        // No `npm run dev`, tudo que começa com /api é repassado para o backend. Para o
        // navegador, app e API estão no mesmo endereço (localhost:5173): não há CORS.
        // 127.0.0.1, e não localhost: o backend só escuta nesse endereço (perfil dev), e o
        // "localhost" pode ser resolvido como ::1 (IPv6) em alguns computadores.
        '/api': env.API_PROXY_ALVO || 'http://127.0.0.1:8080',
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
      // Cobertura (`npm run test:cobertura`, #152). Mede todos os arquivos de src/, e não só os
      // que algum teste importa: um arquivo sem teste nenhum também conta, como 0%.
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/testes/**',
          'src/**/*.d.ts',
          // Só liga o app (createRoot + rotas): sem lógica para testar.
          'src/main.tsx',
          // Só liga o MSW no navegador da demonstração (#162); a API falsa (api.ts) é testada.
          'src/demonstracao/iniciar.ts',
          // O service worker roda num contexto próprio do navegador, que o jsdom não tem.
          // A fila em si (src/fila) é testada; o sw.ts só a chama no Background Sync.
          'src/sw.ts',
        ],
        // text-summary no terminal, html para abrir (coverage/index.html) e json-summary para
        // o resumo do CI. O relatório sai mesmo se algum teste falhar.
        reporter: ['text-summary', 'html', 'json-summary'],
        reportOnFailure: true,
        // Mínimos escolhidos pelo autor. Em 2026-11-17: linhas 96% e branches 87,5%.
        thresholds: { lines: 95, branches: 85 },
      },
    },
  }
})
