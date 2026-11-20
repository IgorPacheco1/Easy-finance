import type { TipoCategoria } from '../api/tipos.ts'
import { formatarMoeda, formatarValorDaTransacao } from '../formatacao/moeda.ts'
import styles from './Mes.module.css'
import { useNumeroQueConta } from './useNumeroQueConta.ts'
import { useValoresVisiveis } from './valoresVisiveis.ts'

type Props = {
  valor: number
  /** Com o tipo, o valor leva o sinal: "− R$ 52,90" ou "+ R$ 3.000,00". */
  tipo?: TipoCategoria
}

/**
 * Valor em reais que obedece ao olho do Mês (#188). Escondido, mostra "R$ •••••" (com o sinal,
 * se tiver tipo) e o leitor de tela ouve "valor escondido", e não "R$ ponto ponto ponto".
 */
export function Valor({ valor, tipo }: Props) {
  const { visiveis } = useValoresVisiveis()
  if (visiveis) {
    return (
      <>{tipo ? formatarValorDaTransacao(valor, tipo) : formatarMoeda(valor)}</>
    )
  }
  const sinal = tipo === 'RECEITA' ? '+ ' : tipo === 'DESPESA' ? '− ' : ''
  return (
    <>
      <span aria-hidden="true">{sinal}R$ •••••</span>
      <span className={styles.somenteParaLeitor}>valor escondido</span>
    </>
  )
}

/**
 * Valor que conta até o número certo ao aparecer (#188). Enquanto conta, o leitor de tela lê só
 * o valor final (os números do meio ficam com `aria-hidden`); terminada a contagem, sobra um texto
 * só.
 */
export function ValorQueConta({ valor }: { valor: number }) {
  const { visiveis } = useValoresVisiveis()
  const mostrado = useNumeroQueConta(valor)
  if (!visiveis) return <Valor valor={valor} />

  const final = formatarMoeda(valor)
  if (mostrado === valor) return <>{final}</>
  return (
    <>
      <span aria-hidden="true">
        {formatarMoeda(Math.round(mostrado * 100) / 100)}
      </span>
      <span className={styles.somenteParaLeitor}>{final}</span>
    </>
  )
}
