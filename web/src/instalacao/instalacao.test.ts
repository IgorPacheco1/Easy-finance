import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  esquecerConvite,
  ouvirConviteParaInstalar,
  usarConvite,
} from './convite.ts'
import { modoDeInstalar } from './useInstalarApp.ts'

/** Um convite falso, como o que o Chrome manda. */
function convidar() {
  const prompt = vi.fn(() => Promise.resolve())
  const evento = Object.assign(
    new Event('beforeinstallprompt', { cancelable: true }),
    {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    },
  )
  window.dispatchEvent(evento)
  return { evento, prompt }
}

function fingirAparelho(userAgent: string, toques = 0) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  // O jsdom não tem maxTouchPoints: o teste cria e o afterEach apaga.
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    value: toques,
  })
}

describe('instalar o app (#217)', () => {
  beforeAll(() => ouvirConviteParaInstalar())

  afterEach(() => {
    esquecerConvite()
    vi.restoreAllMocks()
    Reflect.deleteProperty(window, 'matchMedia')
    Reflect.deleteProperty(navigator, 'maxTouchPoints')
  })

  it('sem convite e fora do iPhone (Firefox no computador), não oferece instalar', () => {
    fingirAparelho('Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0')
    expect(modoDeInstalar()).toBeNull()
  })

  it('com o convite do navegador, guarda o convite e tira a barrinha automática', async () => {
    const { evento, prompt } = convidar()

    expect(evento.defaultPrevented).toBe(true)
    expect(modoDeInstalar()).toBe('navegador')

    await usarConvite()
    expect(prompt).toHaveBeenCalledOnce()
    // O convite só vale uma vez.
    expect(modoDeInstalar()).toBeNull()
  })

  it('no iPhone e no iPad (que se apresenta como Mac, mas com toque), explica o caminho', () => {
    fingirAparelho('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
    expect(modoDeInstalar()).toBe('iphone')

    fingirAparelho('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)
    expect(modoDeInstalar()).toBe('iphone')

    fingirAparelho('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)
    expect(modoDeInstalar()).toBeNull()
  })

  it('aberto pelo ícone (já instalado), não oferece de novo', () => {
    convidar()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (consulta: string) => ({
        matches: consulta === '(display-mode: standalone)',
      }),
    })

    expect(modoDeInstalar()).toBeNull()
  })

  it('depois de instalado agora, a linha some mesmo com o convite', () => {
    convidar()
    window.dispatchEvent(new Event('appinstalled'))

    expect(modoDeInstalar()).toBeNull()
  })
})
