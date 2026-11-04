import { describe, expect, it } from 'vitest'
import type { Transacao } from '../api/tipos.ts'
import { agruparPorDia } from './agrupamento.ts'

function transacao(id: string, data: string): Transacao {
  return {
    id,
    valor: 10,
    data,
    descricao: null,
    categoria: { id: 'c1', nome: 'Mercado', tipo: 'DESPESA' },
  }
}

describe('agruparPorDia', () => {
  it('junta as transações do mesmo dia, na ordem da API', () => {
    const dias = agruparPorDia([
      transacao('a', '2026-11-04'),
      transacao('b', '2026-11-04'),
      transacao('c', '2026-11-01'),
    ])

    expect(dias.map((d) => d.data)).toEqual(['2026-11-04', '2026-11-01'])
    expect(dias[0].transacoes.map((t) => t.id)).toEqual(['a', 'b'])
    expect(dias[1].transacoes.map((t) => t.id)).toEqual(['c'])
  })

  it('lista vazia não tem dias', () => {
    expect(agruparPorDia([])).toEqual([])
  })
})
