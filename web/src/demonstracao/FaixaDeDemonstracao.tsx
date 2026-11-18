import styles from './Faixa.module.css'

/**
 * Faixa no topo de todas as telas da demonstração (#162), para ninguém achar que está usando o
 * app de verdade nem esperar que o que lançou continue lá depois.
 *
 * É um `<aside>` (uma região da página): quem usa leitor de tela navega por regiões, e um texto
 * fora delas podia passar despercebido (achado do axe na revisão da v0.6.0).
 */
export function FaixaDeDemonstracao() {
  return (
    <aside className={styles.faixa} aria-label="Demonstração">
      <p className={styles.texto}>
        <strong>Demonstração:</strong> dados de exemplo, nada é salvo
      </p>
    </aside>
  )
}
