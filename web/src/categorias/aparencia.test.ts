import { describe, expect, it } from 'vitest'
import {
  APARENCIA_PADRAO,
  CORES_DE_CATEGORIA,
  ehCorDeCategoria,
  ehIconeDeCategoria,
  NOMES_DOS_ICONES,
} from './aparencia.ts'

describe('aparência das categorias (#184)', () => {
  it('tem 12 cores e 32 ícones, sem repetição', () => {
    expect(new Set(CORES_DE_CATEGORIA).size).toBe(12)
    expect(new Set(NOMES_DOS_ICONES).size).toBe(32)
  })

  it('reconhece só as cores da lista', () => {
    expect(ehCorDeCategoria('coral')).toBe(true)
    expect(ehCorDeCategoria('Coral')).toBe(false)
    expect(ehCorDeCategoria('#ff5a5f')).toBe(false)
    expect(ehCorDeCategoria(undefined)).toBe(false)
  })

  it('reconhece só os ícones da lista', () => {
    expect(ehIconeDeCategoria('shopping-cart')).toBe(true)
    expect(ehIconeDeCategoria('ShoppingCart')).toBe(false)
    // Uma propriedade que todo objeto tem não pode passar por ícone.
    expect(ehIconeDeCategoria('toString')).toBe(false)
    expect(ehIconeDeCategoria(null)).toBe(false)
  })

  it('a aparência padrão usa valores da lista', () => {
    expect(ehIconeDeCategoria(APARENCIA_PADRAO.icone)).toBe(true)
    expect(ehCorDeCategoria(APARENCIA_PADRAO.cor)).toBe(true)
  })
})
