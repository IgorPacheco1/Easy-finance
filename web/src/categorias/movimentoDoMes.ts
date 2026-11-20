import type { Categoria, ResumoDoTipo } from '../api/tipos.ts'
import { ordenarPorNome } from './regras.ts'

/** O que a categoria movimentou no mês (#191). */
export type Movimento = {
  total: number
  quantidade: number
  /** Tamanho da barra, de 0 a 100: o total em relação à categoria que mais movimentou. */
  parte: number
}

export type ComMovimento = { categoria: Categoria; movimento: Movimento }

/**
 * Separa as categorias de um tipo entre as que tiveram movimento no mês e as que não tiveram
 * (#191), juntando a lista de categorias com o resumo do mês.
 *
 * - Com movimento: na ordem do resumo (a API já manda da que mais somou para a que menos), cada
 *   uma com a barra em relação à maior.
 * - Sem movimento: em ordem alfabética.
 *
 * Uma categoria que está no resumo mas não na lista (excluída enquanto a tela estava aberta) é
 * ignorada.
 */
export function separarPorMovimento(
  categorias: Categoria[],
  resumo: ResumoDoTipo,
): { comMovimento: ComMovimento[]; semMovimento: Categoria[] } {
  const porId = new Map(categorias.map((c) => [c.id, c]))
  const maior = resumo.categorias[0]?.total ?? 0
  const comMovimento: ComMovimento[] = []
  for (const linha of resumo.categorias) {
    const categoria = porId.get(linha.id)
    if (!categoria) continue
    comMovimento.push({
      categoria,
      movimento: {
        total: linha.total,
        quantidade: linha.quantidade,
        parte: maior > 0 ? (linha.total / maior) * 100 : 0,
      },
    })
    porId.delete(linha.id)
  }
  return { comMovimento, semMovimento: ordenarPorNome([...porId.values()]) }
}
