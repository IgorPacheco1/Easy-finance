import { describe, expect, it } from 'vitest'
import type { ResumoDaCategoria } from '../api/tipos.ts'
import { fatiasDaRosca } from './fatiasDaRosca.ts'

function categoria(nome: string, total: number): ResumoDaCategoria {
  return {
    id: nome,
    nome,
    icone: 'circle-ellipsis',
    cor: 'azul',
    total,
    quantidade: 1,
    percentual: 0,
  }
}

describe('fatias da rosca (#190)', () => {
  it('cada categoria vira uma fatia proporcional ao total', () => {
    expect(
      fatiasDaRosca([categoria('Moradia', 300), categoria('Mercado', 100)]),
    ).toEqual([
      { id: 'Moradia', nome: 'Moradia', cor: 'azul', parte: 75 },
      { id: 'Mercado', nome: 'Mercado', cor: 'azul', parte: 25 },
    ])
  })

  it('depois da 5ª, junta o resto numa fatia "Outras" em cinza', () => {
    const fatias = fatiasDaRosca(
      [50, 20, 10, 8, 5, 4, 3].map((total, i) => categoria(`C${i + 1}`, total)),
    )

    expect(fatias.map((f) => f.nome)).toEqual([
      'C1',
      'C2',
      'C3',
      'C4',
      'C5',
      'Outras',
    ])
    expect(fatias[5]).toMatchObject({ id: 'outras', cor: 'cinza' })
    expect(fatias[5].parte).toBeCloseTo(7)
  })

  it('sem nada lançado, não há fatias', () => {
    expect(fatiasDaRosca([])).toEqual([])
  })
})
