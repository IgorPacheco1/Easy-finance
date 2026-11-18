import { setupWorker } from 'msw/browser'
import { respostasDaDemonstracao } from './api.ts'

export { FaixaDeDemonstracao } from './FaixaDeDemonstracao.tsx'

/**
 * Liga a API falsa da demonstração no navegador (#162), antes de o app desenhar a primeira tela.
 *
 * O MSW registra um service worker próprio (mockServiceWorker.js, copiado no build da
 * demonstração pelo vite.config.ts) que responde aos pedidos para /api com os dados de exemplo.
 * Um pedido para /api que nenhuma resposta conhece recebe um erro da própria demonstração
 * (api.ts): a demonstração nunca tenta falar com uma API de verdade. Os outros pedidos (arquivos
 * do app, fonte) seguem normalmente.
 */
export async function iniciarDemonstracao() {
  // Avisa o CSS que há a faixa no topo (Faixa.module.css): a navegação lateral e os avisos descem.
  document.documentElement.dataset.demonstracao = ''
  await setupWorker(...respostasDaDemonstracao()).start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledFrame: 'bypass',
    quiet: true,
  })
}
