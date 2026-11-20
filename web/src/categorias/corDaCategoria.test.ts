import { describe, expect, it } from 'vitest'
import { classeDaCor } from './corDaCategoria.ts'

describe('classeDaCor (#186)', () => {
  it('usa a classe do cinza para uma cor desconhecida', () => {
    expect(classeDaCor('#ff0000')).toBe(classeDaCor('cinza'))
  })
})
