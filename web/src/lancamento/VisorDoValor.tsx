import type { Ref } from 'react'
import { cursorNoFim } from './cursorNoFim.ts'
import styles from './Lancamento.module.css'
import { digitosDoCampo, formatarDigitos } from './valor.ts'

type Props = {
  digitos: string
  aoMudar: (digitos: string) => void
  erro?: string
  ref?: Ref<HTMLInputElement>
}

/**
 * Valor grande no topo do Lançar (#216), digitado com o teclado do próprio celular.
 *
 * Antes era um teclado desenhado na tela (#187), que no celular ficava abaixo da dobra: para
 * alcançá-lo era preciso rolar, e o valor sumia do topo. O teclado do sistema abre por cima da
 * tela, e o valor fica sempre à vista.
 *
 * - `inputMode="numeric"` abre o teclado só de números. Os dígitos entram pela direita, como no
 *   `CampoValor` (caixa registradora: 4590 vira R$ 45,90). O "R$" fica dentro do campo, porque
 *   `digitosDoCampo` ignora o que não é dígito.
 * - A tela abre com o foco aqui (`autoFocus`). No Android o teclado já aparece; no iPhone o Safari
 *   só abre o teclado depois de um toque da pessoa, por isso a dica "Toque no valor para
 *   digitar" (só em telas de toque, ver o CSS).
 * - `enterKeyHint="done"`: a tecla de confirmar do teclado envia o formulário, como o Enter.
 */
export function VisorDoValor({ digitos, aoMudar, erro, ref }: Props) {
  const mostrarDica = digitos === '' && !erro
  return (
    <div className={styles.grupo}>
      <input
        ref={ref}
        id="valor"
        className={
          erro ? `${styles.visor} ${styles.visorComErro}` : styles.visor
        }
        aria-label="Valor"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        autoFocus
        value={`R$ ${formatarDigitos(digitos)}`}
        onChange={(evento) =>
          aoMudar(digitosDoCampo(evento.target.value, digitos))
        }
        onSelect={cursorNoFim}
        onFocus={cursorNoFim}
        aria-invalid={erro ? true : undefined}
        aria-describedby={
          erro ? 'erro-valor' : mostrarDica ? 'dica-valor' : undefined
        }
      />
      {erro ? (
        <p id="erro-valor" className={styles.erroDoCampo}>
          {erro}
        </p>
      ) : (
        mostrarDica && (
          <p id="dica-valor" className={styles.dicaDoValor}>
            Toque no valor para digitar
          </p>
        )
      )}
    </div>
  )
}
