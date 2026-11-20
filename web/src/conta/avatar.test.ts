import { describe, expect, it } from 'vitest'
import { avatarDaCor, corDoAvatar, iniciaisDe } from './avatar.ts'

describe('avatar (#194)', () => {
  it('as iniciais são do primeiro e do último nome', () => {
    expect(iniciaisDe('Ana Souza', 'a@x.com')).toBe('AS')
    expect(iniciaisDe('  ana   maria souza ', 'a@x.com')).toBe('AS')
    expect(iniciaisDe('Ana', 'a@x.com')).toBe('A')
  })

  it('sem nome, usa a primeira letra do e-mail', () => {
    expect(iniciaisDe(null, 'bia@email.com')).toBe('B')
    expect(iniciaisDe('   ', 'bia@email.com')).toBe('B')
  })

  it('lê a cor de "iniciais:<cor>"; o que não conhece vira cinza', () => {
    expect(corDoAvatar('iniciais:verde')).toBe('verde')
    expect(corDoAvatar('iniciais:dourado')).toBe('cinza')
    expect(corDoAvatar('mascote:lobo')).toBe('cinza')
    expect(avatarDaCor('roxo')).toBe('iniciais:roxo')
  })
})
