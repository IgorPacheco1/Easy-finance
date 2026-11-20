import type { ResumoDaCategoria } from '../api/tipos.ts'

/** Quantas categorias ganham fatia própria; as outras se juntam em "Outras". */
export const FATIAS_COM_NOME = 5

export type Fatia = {
  id: string
  nome: string
  cor: string
  /** Parte da rosca, de 0 a 100. */
  parte: number
}

/**
 * As fatias da rosca do resumo (#190): as 5 maiores categorias e, se sobrar alguma, uma fatia
 * "Outras" em cinza com a soma delas. Com 15 categorias, as fatias pequenas viram fiapos que
 * ninguém distingue; a lista embaixo continua com todas.
 *
 * As categorias já vêm da maior para a menor (a API ordena). A parte de cada uma sai do total em
 * reais, e não do percentual arredondado da API, para as fatias fecharem a volta certinho.
 */
export function fatiasDaRosca(categorias: ResumoDaCategoria[]): Fatia[] {
  const total = categorias.reduce((soma, c) => soma + c.total, 0)
  if (total <= 0) return []
  const parte = (valor: number) => (valor / total) * 100

  const fatias: Fatia[] = categorias.slice(0, FATIAS_COM_NOME).map((c) => ({
    id: c.id,
    nome: c.nome,
    cor: c.cor,
    parte: parte(c.total),
  }))
  const resto = categorias.slice(FATIAS_COM_NOME)
  if (resto.length > 0) {
    fatias.push({
      id: 'outras',
      nome: 'Outras',
      cor: 'cinza',
      parte: parte(resto.reduce((soma, c) => soma + c.total, 0)),
    })
  }
  return fatias
}
