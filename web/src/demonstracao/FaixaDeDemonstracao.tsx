import styles from './Faixa.module.css'

/**
 * Faixa no topo de todas as telas da demonstração (#162), para ninguém achar que está usando o
 * app de verdade nem esperar que o que lançou continue lá depois.
 */
export function FaixaDeDemonstracao() {
  return (
    <p className={styles.faixa} role="note">
      <strong>Demonstração:</strong> dados de exemplo, nada é salvo
    </p>
  )
}
