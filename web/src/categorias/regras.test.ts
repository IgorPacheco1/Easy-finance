import { describe, expect, it } from 'vitest'
import type { Categoria } from '../api/tipos.ts'
import { ordenarPorNome, validarNome } from './regras.ts'

function categoria(id: string, nome: string): Categoria {
  return { id, nome, tipo: 'DESPESA', sistema: false }
}

const existentes = [categoria('1', 'Mercado'), categoria('2', 'Pets')]

describe('validarNome', () => {
  it('aceita um nome novo', () => {
    expect(validarNome('Academia', existentes)).toBeUndefined()
  })

  it('exige o nome e ignora os espaços', () => {
    expect(validarNome('   ', existentes)).toBe('O nome é obrigatório.')
  })

  it('limita a 50 caracteres', () => {
    expect(validarNome('a'.repeat(50), existentes)).toBeUndefined()
    expect(validarNome('a'.repeat(51), existentes)).toBe(
      'O nome deve ter no máximo 50 caracteres.',
    )
  })

  it('recusa nome repetido sem diferenciar maiúsculas, como a API', () => {
    expect(validarNome('mercado', existentes)).toBe(
      'Já existe uma categoria chamada "Mercado".',
    )
  })

  it('na edição, a própria categoria pode manter o nome ou trocar maiúsculas', () => {
    expect(validarNome('PETS', existentes, '2')).toBeUndefined()
    expect(validarNome('Mercado', existentes, '2')).toBe(
      'Já existe uma categoria chamada "Mercado".',
    )
  })
})

describe('ordenarPorNome', () => {
  it('ordena em português, sem diferenciar acentos e maiúsculas', () => {
    const nomes = ordenarPorNome([
      categoria('1', 'Saúde'),
      categoria('2', 'academia'),
      categoria('3', 'Água'),
      categoria('4', 'Lazer'),
    ]).map((c) => c.nome)

    expect(nomes).toEqual(['academia', 'Água', 'Lazer', 'Saúde'])
  })
})
