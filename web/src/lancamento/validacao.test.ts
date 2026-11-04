import { describe, expect, it } from 'vitest'
import { validarLancamento, type DadosDoLancamento } from './validacao.ts'

const HOJE = '2026-11-04'
const valido: DadosDoLancamento = {
  digitos: '5290',
  categoriaId: 'c1',
  data: HOJE,
  descricao: '',
}

describe('validarLancamento', () => {
  it('não acusa nada num lançamento válido', () => {
    expect(validarLancamento(valido, HOJE)).toEqual({})
  })

  it('exige valor maior que zero', () => {
    expect(validarLancamento({ ...valido, digitos: '' }, HOJE).valor).toBe(
      'O valor deve ser maior que zero.',
    )
  })

  it('exige a categoria', () => {
    expect(
      validarLancamento({ ...valido, categoriaId: null }, HOJE).categoriaId,
    ).toBe('A categoria é obrigatória.')
  })

  it('aceita os limites exatos de 1 ano e recusa o dia seguinte', () => {
    expect(validarLancamento({ ...valido, data: '2025-11-04' }, HOJE)).toEqual(
      {},
    )
    expect(validarLancamento({ ...valido, data: '2027-11-04' }, HOJE)).toEqual(
      {},
    )
    expect(
      validarLancamento({ ...valido, data: '2027-11-05' }, HOJE).data,
    ).toBe('A data deve estar entre 04/11/2025 e 04/11/2027.')
  })

  it('limita a descrição a 255 caracteres', () => {
    expect(
      validarLancamento({ ...valido, descricao: 'a'.repeat(255) }, HOJE),
    ).toEqual({})
    expect(
      validarLancamento({ ...valido, descricao: 'a'.repeat(256) }, HOJE)
        .descricao,
    ).toBe('A descrição deve ter no máximo 255 caracteres.')
  })
})
