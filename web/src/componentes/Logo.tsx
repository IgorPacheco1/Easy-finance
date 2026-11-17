import styles from './Logo.module.css'

/**
 * Logo do Easy Finance (ADR-0029): o símbolo da carteira e o nome. O desenho é o mesmo de
 * `icones/icone.svg`, em linha para não precisar de outro pedido ao servidor. O símbolo é
 * decorativo (`aria-hidden`): quem usa leitor de tela ouve o nome, que está escrito ao lado.
 */
export function Logo() {
  return (
    <div className={styles.logo}>
      <svg
        className={styles.simbolo}
        viewBox="0 0 512 512"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="512" height="512" rx="112" fill="#E0A458" />
        <rect x="87" y="148" width="338" height="236" rx="72" fill="#1F1410" />
        <rect x="292" y="225" width="154" height="82" rx="41" fill="#E0A458" />
        <circle cx="338" cy="266" r="18" fill="#1F1410" />
      </svg>
      <span className={styles.nome}>Easy Finance</span>
    </div>
  )
}
