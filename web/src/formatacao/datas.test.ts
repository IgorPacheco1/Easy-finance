import { describe, expect, it } from 'vitest'
import {
  dataLocal,
  formatarData,
  formatarDiaDaLista,
  formatarMes,
  hoje,
  mesAtual,
  mesValido,
  mesVizinho,
  ontem,
  periodoDoMes,
  somarAnos,
} from './datas.ts'

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

describe('dia da lista', () => {
  const agora = new Date(2026, 10, 4, 10, 0) // quarta, 04/11/2026

  it('mostra Hoje e Ontem pelo relógio local', () => {
    expect(formatarDiaDaLista('2026-11-04', agora)).toBe('Hoje, 04/11')
    expect(formatarDiaDaLista('2026-11-03', agora)).toBe('Ontem, 03/11')
  })

  it('mostra o dia da semana nos outros dias, sem o "-feira"', () => {
    expect(formatarDiaDaLista('2026-11-02', agora)).toBe('Segunda, 02/11')
    expect(formatarDiaDaLista('2026-11-01', agora)).toBe('Domingo, 01/11')
    expect(formatarDiaDaLista('2026-10-31', agora)).toBe('Sábado, 31/10')
  })

  it('mostra o ano nos dias de outro ano', () => {
    expect(formatarDiaDaLista('2025-12-25', agora)).toBe('Quinta, 25/12/2025')
    expect(formatarDiaDaLista('2027-01-01', agora)).toBe('Sexta, 01/01/2027')
  })

  it('lê a data no fuso local, e não em UTC', () => {
    expect(dataLocal('2026-11-04').getDate()).toBe(4)
  })
})

describe('meses', () => {
  it('mês atual pelo relógio local', () => {
    expect(mesAtual(new Date(2026, 10, 30, 23, 30))).toBe('2026-11')
  })

  it('vizinhos atravessam a virada do ano', () => {
    expect(mesVizinho('2026-11', -1)).toBe('2026-10')
    expect(mesVizinho('2026-12', 1)).toBe('2027-01')
    expect(mesVizinho('2026-01', -1)).toBe('2025-12')
  })

  it('período vai do dia 1 ao último dia do mês', () => {
    expect(periodoDoMes('2026-11')).toEqual({
      de: '2026-11-01',
      ate: '2026-11-30',
    })
    expect(periodoDoMes('2028-02')).toEqual({
      de: '2028-02-01',
      ate: '2028-02-29',
    })
    expect(periodoDoMes('2026-12')).toEqual({
      de: '2026-12-01',
      ate: '2026-12-31',
    })
  })

  it('nome do mês em português', () => {
    expect(formatarMes('2026-11')).toBe('Novembro de 2026')
    expect(formatarMes('2027-03')).toBe('Março de 2027')
  })

  it('aceita só meses no formato AAAA-MM', () => {
    expect(mesValido('2026-11')).toBe(true)
    expect(mesValido('2026-13')).toBe(false)
    expect(mesValido('novembro')).toBe(false)
    expect(mesValido(null)).toBe(false)
  })
})
