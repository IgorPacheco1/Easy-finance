/**
 * O "convite para instalar" do navegador (#217).
 *
 * Chrome e Edge (Android e computador) avisam com o evento `beforeinstallprompt` que o app pode
 * ser instalado. O evento chega uma vez, logo que a página abre, e muito antes de a pessoa ir para
 * a Conta. Por isso ele é guardado aqui desde o início (`ouvirConviteParaInstalar`, no main.tsx),
 * e a linha "Instalar o app" usa o convite guardado quando a pessoa tocar nela.
 *
 * O `preventDefault` tira a barrinha automática do navegador: quem oferece a instalação é o app,
 * na hora em que a pessoa quiser.
 */

/** O evento do Chrome e do Edge. Ainda não está nos tipos do TypeScript (não é padrão). */
export interface ConviteParaInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let convite: ConviteParaInstalar | null = null
let instaladoAgora = false
const ouvintes = new Set<() => void>()

function avisar() {
  for (const ouvinte of ouvintes) ouvinte()
}

export function ouvirConviteParaInstalar(alvo: Window = window) {
  alvo.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault()
    convite = evento as ConviteParaInstalar
    avisar()
  })
  alvo.addEventListener('appinstalled', () => {
    convite = null
    instaladoAgora = true
    avisar()
  })
}

export function conviteGuardado(): ConviteParaInstalar | null {
  return convite
}

export function foiInstaladoAgora(): boolean {
  return instaladoAgora
}

/** Para o `useSyncExternalStore`: avisa quando o convite chega ou é usado. */
export function observarConvite(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

/** Abre a janela de instalação do navegador. O convite só vale uma vez. */
export async function usarConvite(): Promise<void> {
  const atual = convite
  if (!atual) return
  convite = null
  avisar()
  await atual.prompt()
}

/** Só para os testes: volta ao começo. */
export function esquecerConvite() {
  convite = null
  instaladoAgora = false
  avisar()
}
