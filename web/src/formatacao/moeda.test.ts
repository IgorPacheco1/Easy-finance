import { describe, expect, it } from 'vitest'
import { formatarMoeda, formatarValorDaTransacao } from './moeda.ts'

// O Intl separa "R$" do número com um espaço que não quebra a linha (\u00a0).
const nbsp = '\u00a0'

describe('moeda', () => {
  it('formata no padrão brasileiro', () => {
    expect(formatarMoeda(52.9)).toBe(`R$${nbsp}52,90`)
    expect(formatarMoeda(3000)).toBe(`R$${nbsp}3.000,00`)
    expect(formatarMoeda(-150.75)).toBe(`-R$${nbsp}150,75`)
  })

  it('mostra o sinal pelo tipo da categoria', () => {
    expect(formatarValorDaTransacao(52.9, 'DESPESA')).toBe(`− R$${nbsp}52,90`)
    expect(formatarValorDaTransacao(3000, 'RECEITA')).toBe(
      `+ R$${nbsp}3.000,00`,
    )
  })
})
