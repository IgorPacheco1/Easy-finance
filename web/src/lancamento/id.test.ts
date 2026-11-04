import { describe, expect, it } from 'vitest'
import { gerarId } from './id.ts'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('gerarId', () => {
  it('gera um UUID v4', () => {
    expect(gerarId()).toMatch(UUID_V4)
  })

  it('gera um UUID v4 mesmo sem crypto.randomUUID (app aberto sem HTTPS)', () => {
    // Simula um navegador sem a função e devolve a original no fim do teste.
    const original = crypto.randomUUID
    Object.defineProperty(crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    })
    try {
      const ids = new Set(Array.from({ length: 100 }, () => gerarId()))

      expect([...ids].every((id) => UUID_V4.test(id))).toBe(true)
      expect(ids.size).toBe(100)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', {
        value: original,
        configurable: true,
      })
    }
  })
})
