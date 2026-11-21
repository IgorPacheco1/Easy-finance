import type { SyntheticEvent } from 'react'

/**
 * No estilo caixa registradora, o dígito novo sempre entra no fim. Se o cursor ficasse no
 * meio (por exemplo, a pessoa tocou no começo do número), "5" + "290" viraria 52.900,00.
 * Por isso o cursor é levado para o fim sempre que se move.
 */
export function cursorNoFim(evento: SyntheticEvent<HTMLInputElement>) {
  const campo = evento.currentTarget
  const fim = campo.value.length
  if (campo.selectionStart !== fim || campo.selectionEnd !== fim) {
    campo.setSelectionRange(fim, fim)
  }
}
