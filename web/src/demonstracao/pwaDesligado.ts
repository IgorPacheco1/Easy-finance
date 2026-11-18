/**
 * Troca o módulo `virtual:pwa-register/react` no build da demonstração (#162, vite.config.ts):
 * lá o PWA fica desligado (sem instalar, sem cache e sem service worker do app; só o do MSW),
 * então nunca há "versão nova" para avisar.
 */
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as const,
    offlineReady: [false, () => {}] as const,
    updateServiceWorker: async () => {},
  }
}
