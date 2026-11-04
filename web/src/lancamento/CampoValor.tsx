import type { Ref, SyntheticEvent } from 'react'
import styles from './Lancamento.module.css'
import { digitosDoCampo, formatarDigitos } from './valor.ts'

type Props = {
  digitos: string
  aoMudar: (digitos: string) => void
  erro?: string
  ref?: Ref<HTMLInputElement>
}

/**
 * No estilo caixa registradora, o dígito novo sempre entra no fim. Se o cursor ficasse no
 * meio (por exemplo, a pessoa tocou no começo do número), "5" + "290" viraria 52.900,00.
 * Por isso o cursor é levado para o fim sempre que se move.
 */
function cursorNoFim(evento: SyntheticEvent<HTMLInputElement>) {
  const campo = evento.currentTarget
  const fim = campo.value.length
  if (campo.selectionStart !== fim || campo.selectionEnd !== fim) {
    campo.setSelectionRange(fim, fim)
  }
}

/**
 * Valor no estilo caixa registradora: o teclado numérico abre e os dígitos entram pela
 * direita (ver valor.ts). O campo mostra o valor formatado, e o estado guarda só os dígitos.
 */
export function CampoValor({ digitos, aoMudar, erro, ref }: Props) {
  return (
    <div className={styles.grupo}>
      <label htmlFor="valor" className={styles.rotulo}>
        Valor
      </label>
      <div className={styles.linhaDoValor}>
        <span className={styles.moeda} aria-hidden="true">
          R$
        </span>
        <input
          ref={ref}
          id="valor"
          className={styles.campoDoValor}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="next"
          value={formatarDigitos(digitos)}
          onChange={(evento) =>
            aoMudar(digitosDoCampo(evento.target.value, digitos))
          }
          onSelect={cursorNoFim}
          onFocus={cursorNoFim}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? 'erro-valor' : undefined}
        />
      </div>
      {erro && (
        <p id="erro-valor" className={styles.erroDoCampo}>
          {erro}
        </p>
      )}
    </div>
  )
}
