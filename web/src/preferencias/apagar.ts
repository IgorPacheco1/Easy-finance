import { CHAVE_ESCONDER_VALORES } from './esconderValores.ts'
import { aplicarTema, CHAVE_DO_TEMA } from './tema.ts'

/**
 * Apaga as preferências do aparelho (#195) e volta o tema para o do sistema. Faz parte de "apagar
 * os dados do aparelho" (ADR-0027): ao sair, ao excluir a conta e quando outra pessoa entra.
 */
export function apagarPreferencias(): void {
  try {
    window.localStorage.removeItem(CHAVE_DO_TEMA)
    window.localStorage.removeItem(CHAVE_ESCONDER_VALORES)
  } catch {
    // Sem localStorage, não havia nada guardado.
  }
  aplicarTema('sistema')
}
