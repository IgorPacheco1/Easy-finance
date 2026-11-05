/**
 * Versão falsa do módulo `virtual:pwa-register/react` para os testes (ligada no vite.config.ts).
 *
 * O módulo de verdade é criado pelo vite-plugin-pwa e só faz sentido no navegador com service
 * worker. No Windows, o Vitest nem consegue carregá-lo (ele vira um endereço de arquivo
 * inválido). Aqui ele responde "não há versão nova", e as telas aparecem normalmente.
 * O teste do próprio aviso (pwa/AvisoDeAtualizacao.test.tsx) troca esta resposta com vi.mock.
 */
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as const,
    offlineReady: [false, () => {}] as const,
    updateServiceWorker: async () => {},
  }
}
