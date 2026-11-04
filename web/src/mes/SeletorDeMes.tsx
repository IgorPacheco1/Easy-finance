import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatarMes, mesVizinho, type Mes } from '../formatacao/datas.ts'
import styles from './Mes.module.css'

type Props = {
  mes: Mes
  aoMudar: (mes: Mes) => void
}

/** Título da tela com as setas de mês anterior e próximo mês. */
export function SeletorDeMes({ mes, aoMudar }: Props) {
  return (
    <header className={styles.cabecalho}>
      <button
        type="button"
        className={styles.seta}
        aria-label="Mês anterior"
        onClick={() => aoMudar(mesVizinho(mes, -1))}
      >
        <ChevronLeft size={24} aria-hidden="true" />
      </button>
      <h1 className={styles.titulo}>{formatarMes(mes)}</h1>
      <button
        type="button"
        className={styles.seta}
        aria-label="Próximo mês"
        onClick={() => aoMudar(mesVizinho(mes, 1))}
      >
        <ChevronRight size={24} aria-hidden="true" />
      </button>
    </header>
  )
}
