/**
 * "Esconder valores ao abrir o Mês" (#195): liga o olho do Mês (#188) sozinho, para quem abre o app
 * perto de outras pessoas. Guardado no aparelho, como o tema.
 */
export const CHAVE_ESCONDER_VALORES = 'easy-finance:esconder-valores'

export function lerEsconderValores(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_ESCONDER_VALORES) === 'sim'
  } catch {
    return false
  }
}

export function salvarEsconderValores(esconder: boolean): void {
  try {
    if (esconder) window.localStorage.setItem(CHAVE_ESCONDER_VALORES, 'sim')
    else window.localStorage.removeItem(CHAVE_ESCONDER_VALORES)
  } catch {
    // Sem localStorage: a escolha vale só até fechar o app.
  }
}
