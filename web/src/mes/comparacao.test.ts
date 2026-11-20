import { describe, expect, it } from 'vitest'
import type { ResumoDaCategoria } from '../api/tipos.ts'
import { resumo } from '../testes/dados.ts'
import { periodosDaComparacao, textoDaComparacao } from './comparacao.ts'

function categoria(id: string, nome: string, total: number): ResumoDaCategoria {
  return {
    id,
    nome,
    icone: 'circle-ellipsis',
    cor: 'cinza',
    total,
    quantidade: 1,
    percentual: 0,
  }
}

describe('períodos da comparação com o mês anterior (#188)', () => {
  it('mês atual: do dia 1 até hoje, contra o mesmo pedaço do mês anterior', () => {
    expect(periodosDaComparacao('2026-11', '2026-11-05')).toEqual({
      atual: { de: '2026-11-01', ate: '2026-11-05' },
      anterior: { de: '2026-10-01', ate: '2026-10-05' },
      mesAnterior: '2026-10',
      mesmoPeriodo: true,
    })
  })

  it('mês anterior mais curto: vai até o último dia dele', () => {
    expect(periodosDaComparacao('2026-03', '2026-03-31')?.anterior).toEqual({
      de: '2026-02-01',
      ate: '2026-02-28',
    })
  })

  it('janeiro compara com dezembro do ano anterior', () => {
    expect(periodosDaComparacao('2027-01', '2027-01-10')?.anterior).toEqual({
      de: '2026-12-01',
      ate: '2026-12-10',
    })
  })

  it('mês passado: mês inteiro contra mês inteiro', () => {
    expect(periodosDaComparacao('2026-10', '2026-11-05')).toEqual({
      atual: { de: '2026-10-01', ate: '2026-10-31' },
      anterior: { de: '2026-09-01', ate: '2026-09-30' },
      mesAnterior: '2026-09',
      mesmoPeriodo: false,
    })
  })

  it('mês futuro: não compara', () => {
    expect(periodosDaComparacao('2026-12', '2026-11-05')).toBeNull()
  })
})

describe('frase da comparação (#188)', () => {
  const OUTUBRO_INTEIRO = { mesAnterior: '2026-10', mesmoPeriodo: false }
  const OUTUBRO_ATE_HOJE = { mesAnterior: '2026-10', mesmoPeriodo: true }

  it('gastou menos, com a categoria que mais mudou', () => {
    const atual = resumo({
      despesas: [
        categoria('m', 'Mercado', 60),
        categoria('t', 'Transporte', 28),
      ],
    })
    const anterior = resumo({
      despesas: [
        categoria('m', 'Mercado', 90),
        categoria('t', 'Transporte', 10),
      ],
    })

    expect(textoDaComparacao(atual, anterior, OUTUBRO_ATE_HOJE)).toBe(
      'Você gastou 12% menos que no mesmo período de outubro de 2026. A maior mudança foi em Mercado.',
    )
  })

  it('gastou mais; categoria que só existe num dos meses também conta', () => {
    const atual = resumo({
      despesas: [categoria('m', 'Mercado', 100), categoria('v', 'Viagem', 50)],
    })
    const anterior = resumo({ despesas: [categoria('m', 'Mercado', 100)] })

    expect(textoDaComparacao(atual, anterior, OUTUBRO_INTEIRO)).toBe(
      'Você gastou 50% mais que em outubro de 2026. A maior mudança foi em Viagem.',
    )
  })

  it('com uma categoria só, não repete o nome dela', () => {
    const atual = resumo({ despesas: [categoria('m', 'Mercado', 120)] })
    const anterior = resumo({ despesas: [categoria('m', 'Mercado', 100)] })

    expect(textoDaComparacao(atual, anterior, OUTUBRO_INTEIRO)).toBe(
      'Você gastou 20% mais que em outubro de 2026.',
    )
  })

  it('gasto parecido: diz que ficou parecido, nos dois tipos de período', () => {
    const igual = resumo({
      despesas: [
        categoria('m', 'Mercado', 50),
        categoria('t', 'Transporte', 50),
      ],
    })

    expect(textoDaComparacao(igual, igual, OUTUBRO_INTEIRO)).toBe(
      'Seus gastos ficaram parecidos com os de outubro de 2026.',
    )
    expect(textoDaComparacao(igual, igual, OUTUBRO_ATE_HOJE)).toBe(
      'Seus gastos ficaram parecidos com os do mesmo período de outubro de 2026.',
    )
  })

  it('sem gasto em um dos dois períodos, não há frase', () => {
    const comGasto = resumo({ despesas: [categoria('m', 'Mercado', 10)] })

    expect(textoDaComparacao(resumo(), comGasto, OUTUBRO_INTEIRO)).toBeNull()
    expect(textoDaComparacao(comGasto, resumo(), OUTUBRO_INTEIRO)).toBeNull()
  })
})
