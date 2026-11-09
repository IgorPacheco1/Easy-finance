/**
 * Envio em segundo plano (Background Sync, ADR-0019): pede ao navegador que acorde o service
 * worker quando a conexão voltar, mesmo com o app fechado. O service worker então envia a fila
 * (evento `sync` em src/sw.ts).
 *
 * Funciona no Chrome e no Edge (Android e computador). O Safari (iPhone) não tem esse recurso:
 * lá, a fila é enviada ao abrir o app, quando a conexão volta com ele aberto e pelo botão
 * "Enviar agora" (useFila.ts). Por isso este pedido é "melhor esforço": se não der, nada quebra.
 */

/** Nome do pedido de envio; o service worker reconhece por ele. */
export const ETIQUETA_DO_ENVIO = 'enviar-fila'

/** O TypeScript ainda não conhece o Background Sync: esta é a parte que o app usa. */
type RegistroComSync = ServiceWorkerRegistration & {
  sync?: { register(etiqueta: string): Promise<void> }
}

export async function pedirEnvioEmSegundoPlano(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    const registro = (await navigator.serviceWorker.ready) as RegistroComSync
    await registro.sync?.register(ETIQUETA_DO_ENVIO)
  } catch {
    // Sem suporte, sem permissão ou sem service worker (no `npm run dev`): fica para o envio
    // com o app aberto.
  }
}
