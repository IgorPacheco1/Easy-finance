import { describe, expect, it } from 'vitest'
import {
  FILTRO_VAZIO,
  lerDoEndereco,
  paraApi,
  paraEndereco,
  periodoIncompleto,
  quantosFiltros,
} from './filtroDaBusca.ts'

const CATEGORIA = '00000000-0000-4000-8000-000000000001'

describe('filtro da busca', () => {
  it('ida e volta pelo endereço mantém tudo', () => {
    const filtro = {
      descricao: 'uber',
      categoriaId: CATEGORIA,
      tipo: 'DESPESA' as const,
      valorMinimo: '1000',
      valorMaximo: '5290',
      de: '2026-10-01',
      ate: '2026-10-31',
    }

    const endereco = paraEndereco(filtro)

    expect(endereco).toEqual({
      descricao: 'uber',
      categoriaId: CATEGORIA,
      tipo: 'DESPESA',
      valorMinimo: '10.00',
      valorMaximo: '52.90',
      de: '2026-10-01',
      ate: '2026-10-31',
    })
    expect(lerDoEndereco(new URLSearchParams(endereco))).toEqual(filtro)
  })

  it('filtro vazio vira endereço vazio', () => {
    expect(paraEndereco(FILTRO_VAZIO)).toEqual({})
    expect(paraEndereco({ ...FILTRO_VAZIO, descricao: '   ' })).toEqual({})
  })

  it('ignora o que vier fora do formato no endereço', () => {
    const lido = lerDoEndereco(
      new URLSearchParams({
        tipo: 'GASTO',
        categoriaId: '123',
        valorMinimo: 'dez',
        valorMaximo: '-5',
        de: '01/10/2026',
      }),
    )

    expect(lido).toEqual(FILTRO_VAZIO)
  })

  it('converte para a API: valores em reais e período só com as duas datas', () => {
    expect(
      paraApi({
        ...FILTRO_VAZIO,
        descricao: '  uber ',
        valorMinimo: '5290',
        de: '2026-10-01',
      }),
    ).toEqual({
      periodo: undefined,
      categoriaId: undefined,
      tipo: undefined,
      descricao: 'uber',
      valorMinimo: 52.9,
      valorMaximo: undefined,
    })
    expect(
      paraApi({ ...FILTRO_VAZIO, de: '2026-10-01', ate: '2026-10-31' }).periodo,
    ).toEqual({ de: '2026-10-01', ate: '2026-10-31' })
  })

  it('avisa quando só uma das datas foi escolhida', () => {
    expect(periodoIncompleto({ ...FILTRO_VAZIO, de: '2026-10-01' })).toBe(true)
    expect(periodoIncompleto({ ...FILTRO_VAZIO, ate: '2026-10-31' })).toBe(true)
    expect(periodoIncompleto(FILTRO_VAZIO)).toBe(false)
  })

  it('conta os filtros do painel, sem o texto, e a faixa de valor como um só', () => {
    expect(quantosFiltros({ ...FILTRO_VAZIO, descricao: 'uber' })).toBe(0)
    expect(
      quantosFiltros({
        ...FILTRO_VAZIO,
        tipo: 'DESPESA',
        valorMinimo: '100',
        valorMaximo: '900',
      }),
    ).toBe(2)
  })
})
