import { useId } from 'react'
import styles from './Logo.module.css'

/**
 * Logo do app (ADR-0033): o lobo-guará "espiando a moeda" e o nome. O desenho é o mesmo de
 * `icones/icone.svg`, em linha para não precisar de outro pedido ao servidor. O símbolo é
 * decorativo (`aria-hidden`): quem usa leitor de tela ouve o nome, que está escrito ao lado.
 *
 * O `clipPath` (que corta a cabeça na borda arredondada) precisa de um id único na página: com
 * `useId`, duas logos na mesma tela não pegam o recorte uma da outra.
 */
export function Logo() {
  const corte = useId()
  return (
    <div className={styles.logo}>
      <svg
        className={styles.simbolo}
        viewBox="0 0 512 512"
        aria-hidden="true"
        focusable="false"
      >
        <clipPath id={corte}>
          <rect width="512" height="512" rx="112" />
        </clipPath>
        <rect width="512" height="512" rx="112" fill="#1D1E20" />
        <circle cx="330" cy="150" r="74" fill="#F08A52" />
        <circle
          cx="330"
          cy="150"
          r="52"
          fill="none"
          stroke="#D9622B"
          strokeWidth="12"
        />
        <g clipPath={`url(#${corte})`}>
          <g transform="translate(230 430) scale(-4.6 4.6) translate(-57 -74)">
            <path
              d="M44 40 L52 72 L66 58 Z M84 36 L80 70 L96 62 Z"
              fill="#D9622B"
              stroke="#1D1E20"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M48 48 L54 66 M84 46 L83 64"
              stroke="#FAF9F7"
              strokeWidth="3"
            />
            <path
              d="M40 80 Q42 58 70 58 Q96 60 96 84 Q94 104 72 108 L44 104 Q20 100 18 92 Q20 84 40 80 Z"
              fill="#D9622B"
              stroke="#1D1E20"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M18 92 Q30 96 44 104 L46 96 Z" fill="#FAF9F7" />
            <path
              d="M72 108 Q84 104 94 92 Q98 104 90 112 Q80 116 72 108 Z"
              fill="#1D1E20"
            />
            <circle cx="17" cy="91" r="4" fill="#1D1E20" />
            <circle
              cx="54"
              cy="80"
              r="8.5"
              fill="#FFFFFF"
              stroke="#1D1E20"
              strokeWidth="3.5"
            />
            <circle cx="55.5" cy="81.5" r="2.5" fill="#1D1E20" />
            <path
              d="M44 65.5 L64 71.5"
              stroke="#1D1E20"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle
              cx="78"
              cy="78"
              r="8.5"
              fill="#FFFFFF"
              stroke="#1D1E20"
              strokeWidth="3.5"
            />
            <circle cx="79.5" cy="79.5" r="2.5" fill="#1D1E20" />
            <path
              d="M67 63.5 Q78 53.5 89 61.5"
              fill="none"
              stroke="#1D1E20"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M28 100 Q36 96 42 102"
              fill="none"
              stroke="#1D1E20"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>
      <span className={styles.nome}>
        {/* O "á" na cor de destaque liga o nome à marca. Para o leitor de tela não ler
            "Guard" e "á" separados, o desenho fica escondido dele e o nome vai inteiro ao lado. */}
        <span aria-hidden="true">
          Guard<span className={styles.acento}>á</span>
        </span>
        <span className={styles.somenteParaLeitor}>Guardá</span>
      </span>
    </div>
  )
}
