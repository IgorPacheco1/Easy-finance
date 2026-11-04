import { describe, expect, it } from 'vitest'
import { formatarData, hoje, ontem, somarAnos } from './data.ts'

describe('datas', () => {
  it('hoje usa o relógio local, e não UTC', () => {
    // 22h30 do dia 4 no horário local: em UTC já seria dia 5 no Brasil.
    const noiteDoDia4 = new Date(2026, 10, 4, 22, 30)
    expect(hoje(noiteDoDia4)).toBe('2026-11-04')
  })

  it('ontem atravessa a virada do mês e do ano', () => {
    expect(ontem(new Date(2026, 10, 1, 9, 0))).toBe('2026-10-31')
    expect(ontem(new Date(2027, 0, 1, 9, 0))).toBe('2026-12-31')
  })

  it('soma anos como o Java, ajustando o 29 de fevereiro', () => {
    expect(somarAnos('2026-11-04', -1)).toBe('2025-11-04')
    expect(somarAnos('2026-11-04', 1)).toBe('2027-11-04')
    expect(somarAnos('2028-02-29', -1)).toBe('2027-02-28')
  })

  it('formata no padrão brasileiro', () => {
    expect(formatarData('2026-11-04')).toBe('04/11/2026')
  })
})
