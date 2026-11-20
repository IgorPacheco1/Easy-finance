import type { Resumo, ResumoDaCategoria } from '../api/tipos.ts'
import {
  formatarMes,
  mesVizinho,
  periodoDoMes,
  type Mes,
} from '../formatacao/datas.ts'

type Periodo = { de: string; ate: string }

export type PeriodosDaComparacao = {
  atual: Periodo
  anterior: Periodo
  mesAnterior: Mes
  /** true no mês atual: compara só até o mesmo dia do mês anterior. */
  mesmoPeriodo: boolean
}

/**
 * Que pedaço de cada mês comparar (#188).
 *
 * - Mês atual: ainda está pela metade, então compara do dia 1 até hoje com o mesmo pedaço do mês
 *   anterior. Sem isso, no dia 5 a frase diria "você gastou 80% menos" só porque o mês mal
 *   começou. Se o mês anterior for mais curto (31/03 contra fevereiro), vai até o último dia dele.
 * - Mês passado: mês inteiro contra mês inteiro.
 * - Mês futuro: não há o que comparar (null).
 */
export function periodosDaComparacao(
  mes: Mes,
  hoje: string,
): PeriodosDaComparacao | null {
  const mesDeHoje = hoje.slice(0, 7)
  if (mes > mesDeHoje) return null

  const mesAnterior = mesVizinho(mes, -1)
  const inteiroDoAnterior = periodoDoMes(mesAnterior)
  if (mes < mesDeHoje) {
    return {
      atual: periodoDoMes(mes),
      anterior: inteiroDoAnterior,
      mesAnterior,
      mesmoPeriodo: false,
    }
  }
  const ultimoDiaDoAnterior = inteiroDoAnterior.ate.slice(8)
  const dia = hoje.slice(8)
  return {
    atual: { de: `${mes}-01`, ate: hoje },
    anterior: {
      de: inteiroDoAnterior.de,
      // "05" < "28" funciona como número, porque os dois têm dois dígitos.
      ate: `${mesAnterior}-${dia < ultimoDiaDoAnterior ? dia : ultimoDiaDoAnterior}`,
    },
    mesAnterior,
    mesmoPeriodo: true,
  }
}

/**
 * A frase do insight: quanto gastou a mais ou a menos que no mês anterior e, se houver mais de uma
 * categoria, a que mais mudou. Sem gasto em um dos dois períodos, não há frase (null): "100% a
 * menos" no começo do mês não ajudaria ninguém.
 */
export function textoDaComparacao(
  atual: Resumo,
  anterior: Resumo,
  periodos: Pick<PeriodosDaComparacao, 'mesAnterior' | 'mesmoPeriodo'>,
): string | null {
  const gastoAtual = atual.despesas.total
  const gastoAnterior = anterior.despesas.total
  if (gastoAtual <= 0 || gastoAnterior <= 0) return null

  const nome = formatarMes(periodos.mesAnterior).toLowerCase()
  const variacao = Math.round(
    ((gastoAtual - gastoAnterior) / gastoAnterior) * 100,
  )
  const frase =
    variacao === 0
      ? `Seus gastos ficaram parecidos com os ${periodos.mesmoPeriodo ? `do mesmo período de ${nome}` : `de ${nome}`}.`
      : `Você gastou ${Math.abs(variacao)}% ${variacao < 0 ? 'menos' : 'mais'} que ${periodos.mesmoPeriodo ? `no mesmo período de ${nome}` : `em ${nome}`}.`

  const categoria = maiorMudanca(
    atual.despesas.categorias,
    anterior.despesas.categorias,
  )
  return categoria ? `${frase} A maior mudança foi em ${categoria}.` : frase
}

/** A categoria cujo gasto mais mudou, para cima ou para baixo, entre os dois períodos. */
function maiorMudanca(
  atuais: ResumoDaCategoria[],
  anteriores: ResumoDaCategoria[],
): string | null {
  const mudancas = new Map<string, { nome: string; diferenca: number }>()
  for (const categoria of anteriores) {
    mudancas.set(categoria.id, {
      nome: categoria.nome,
      diferenca: -categoria.total,
    })
  }
  for (const categoria of atuais) {
    const antes = mudancas.get(categoria.id)?.diferenca ?? 0
    mudancas.set(categoria.id, {
      nome: categoria.nome,
      diferenca: antes + categoria.total,
    })
  }
  if (mudancas.size < 2) return null // uma categoria só: a frase já diz tudo

  let maior: { nome: string; diferenca: number } | null = null
  for (const mudanca of mudancas.values()) {
    if (!maior || Math.abs(mudanca.diferenca) > Math.abs(maior.diferenca)) {
      maior = mudanca
    }
  }
  return maior && Math.abs(maior.diferenca) >= 0.01 ? maior.nome : null
}
