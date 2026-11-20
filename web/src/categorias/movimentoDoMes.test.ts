import { describe, expect, it } from 'vitest'
import type { ResumoDaCategoria } from '../api/tipos.ts'
import { MERCADO, TRANSPORTE } from '../testes/dados.ts'
import { separarPorMovimento } from './movimentoDoMes.ts'

function noResumo(
  id: string,
  total: number,
  quantidade: number,
): ResumoDaCategoria {
  return {
    id,
    nome: '',
    icone: 'circle-ellipsis',
    cor: 'cinza',
    total,
    quantidade,
    percentual: 0,
  }
}

describe('categorias com e sem movimento no mês (#191)', () => {
  it('com movimento na ordem do resumo, com a barra em relação à maior', () => {
    const { comMovimento, semMovimento } = separarPorMovimento(
      [MERCADO, TRANSPORTE],
      {
        total: 300,
        categorias: [
          noResumo(TRANSPORTE.id, 200, 4),
          noResumo(MERCADO.id, 100, 2),
        ],
      },
    )

    expect(comMovimento).toEqual([
      {
        categoria: TRANSPORTE,
        movimento: { total: 200, quantidade: 4, parte: 100 },
      },
      {
        categoria: MERCADO,
        movimento: { total: 100, quantidade: 2, parte: 50 },
      },
    ])
    expect(semMovimento).toEqual([])
  })

  it('sem movimento em ordem alfabética; categoria que sumiu da lista é ignorada', () => {
    const { comMovimento, semMovimento } = separarPorMovimento(
      [TRANSPORTE, MERCADO],
      { total: 10, categorias: [noResumo('excluida', 10, 1)] },
    )

    expect(comMovimento).toEqual([])
    expect(semMovimento.map((c) => c.nome)).toEqual(['Mercado', 'Transporte'])
  })
})
