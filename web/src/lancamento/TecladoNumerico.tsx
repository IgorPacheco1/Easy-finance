import { Delete } from 'lucide-react'
import styles from './Lancamento.module.css'

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0']

type Props = {
  aoDigitar: (tecla: string) => void
  aoApagar: () => void
}

/**
 * Teclado da tela de lançamento (#187), como numa calculadora. São botões de verdade: funcionam
 * com toque, mouse, Tab e leitor de tela. O valor fica sempre certo porque cada tecla passa pelas
 * mesmas regras de valor.ts.
 *
 * `data-enter-lanca`: com o foco aqui, o Enter do teclado físico lança (useTecladoFisico).
 */
export function TecladoNumerico({ aoDigitar, aoApagar }: Props) {
  return (
    <div
      className={styles.teclado}
      role="group"
      aria-label="Teclado do valor"
      data-enter-lanca
    >
      {TECLAS.map((tecla) => (
        <button
          key={tecla}
          type="button"
          className={styles.tecla}
          onClick={() => aoDigitar(tecla)}
        >
          {tecla}
        </button>
      ))}
      <button
        type="button"
        className={styles.tecla}
        aria-label="Apagar"
        onClick={aoApagar}
      >
        <Delete aria-hidden="true" />
      </button>
    </div>
  )
}
