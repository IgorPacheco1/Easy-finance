/// <reference lib="webworker" />
/**
 * Service worker do app (ADR-0015 e ADR-0019). Escrito por nós (modo `injectManifest` do
 * vite-plugin-pwa) para tratar o envio em segundo plano da fila de lançamentos.
 *
 * Faz três coisas:
 * 1. Guarda no aparelho só a "casca" do app (HTML, JS, CSS e ícones), para ele abrir sem
 *    internet. Respostas da API NUNCA são guardadas (ADR-0015).
 * 2. Atualiza para a versão nova só quando a pessoa toca em "Atualizar" (mensagem SKIP_WAITING,
 *    enviada pelo src/pwa/AvisoDeAtualizacao.tsx).
 * 3. Quando a conexão volta, envia a fila de lançamentos (evento `sync`), mesmo com o app
 *    fechado, nos navegadores que permitem (Chrome e Edge).
 */
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { enviarFila } from './fila/envio.ts'
import { ETIQUETA_DO_ENVIO } from './fila/segundoPlano.ts'

declare const self: ServiceWorkerGlobalScope

/** O evento do Background Sync; o TypeScript ainda não tem o tipo dele. */
type EventoDeSync = ExtendableEvent & { tag: string }

// 1. A lista de arquivos da casca é colocada aqui pelo build (self.__WB_MANIFEST).
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Abrir /mes ou /categorias sem internet entrega o index.html (o roteador resolve a tela)...
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    // ...mas um endereço da API nunca vira o index.html.
    denylist: [/^\/api\//],
  }),
)

// 2. Versão nova só entra quando a pessoa pede.
self.addEventListener('message', (evento) => {
  if (evento.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

// 3. Envio da fila em segundo plano.
self.addEventListener('sync', (evento) => {
  const sync = evento as EventoDeSync
  if (sync.tag !== ETIQUETA_DO_ENVIO) return
  sync.waitUntil(
    enviarFila().then(async (resultado) => {
      // Se o app estiver aberto, avisa para ele atualizar o aviso de pendentes e a tela.
      const janelas = await self.clients.matchAll({ type: 'window' })
      for (const janela of janelas) {
        janela.postMessage({ type: 'FILA_ENVIADA', resultado })
      }
      // Se algo continuou pendente (a rede caiu de novo), o navegador tenta mais tarde.
      if (resultado.pendentes > 0) {
        throw new Error('Ainda há lançamentos pendentes.')
      }
    }),
  )
})
