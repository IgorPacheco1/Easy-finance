import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Link } from 'react-router'
import { formatarMes, mesVizinho, type Mes } from '../formatacao/datas.ts'
import styles from './Mes.module.css'

type Props = {
  mes: Mes
  aoMudar: (mes: Mes) => void
}

/**
 * Título da tela com as setas de mês anterior e próximo mês, e a lupa que abre a busca (#94).
 * A busca fica aqui, e não numa aba própria, porque procurar um lançamento antigo é algo de vez
 * em quando; a barra de baixo fica com as três ações do dia a dia.
 */
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
      <Link
        to="/buscar"
        className={styles.seta}
        aria-label="Buscar lançamentos"
      >
        <Search size={22} aria-hidden="true" />
      </Link>
    </header>
  )
}
