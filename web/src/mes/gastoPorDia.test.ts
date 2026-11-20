import { describe, expect, it } from 'vitest'
import { diaDeMaiorGasto, mediaDiaria } from './gastoPorDia.ts'

describe('média diária do gasto (#189)', () => {
  it('mês passado: divide pelo mês inteiro', () => {
    expect(mediaDiaria(310, 31, '2026-10', '2026-11-05')).toBe(10)
  })

  it('mês atual: divide pelos dias até hoje', () => {
    expect(mediaDiaria(150, 30, '2026-11', '2026-11-05')).toBe(30)
  })

  it('arredonda para centavos', () => {
    expect(mediaDiaria(100, 30, '2026-11', '2026-11-03')).toBe(33.33)
  })

  it('mês futuro: sem média', () => {
    expect(mediaDiaria(80, 31, '2026-12', '2026-11-05')).toBeNull()
  })
})

describe('dia de maior gasto (#189)', () => {
  it('o maior; no empate, o primeiro', () => {
    expect(
      diaDeMaiorGasto([
        { data: '2026-11-01', total: 10 },
        { data: '2026-11-02', total: 50 },
        { data: '2026-11-03', total: 50 },
      ]),
    ).toEqual({ data: '2026-11-02', total: 50 })
  })

  it('sem gasto nenhum: null', () => {
    expect(diaDeMaiorGasto([{ data: '2026-11-01', total: 0 }])).toBeNull()
    expect(diaDeMaiorGasto([])).toBeNull()
  })
})
