import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CarregarMais } from './CarregarMais.tsx'

/**
 * O jsdom não tem IntersectionObserver. Este falso guarda o que o componente pediu, e o teste
 * chama `avisar` para fazer de conta que o fim da lista apareceu (ou sumiu) da tela.
 */
class ObservadorFalso {
  static criados: ObservadorFalso[] = []
  observe = vi.fn()
  disconnect = vi.fn()
  aoMudar: (entradas: { isIntersecting: boolean }[]) => void
  opcoes: IntersectionObserverInit

  constructor(
    aoMudar: (entradas: { isIntersecting: boolean }[]) => void,
    opcoes: IntersectionObserverInit,
  ) {
    this.aoMudar = aoMudar
    this.opcoes = opcoes
    ObservadorFalso.criados.push(this)
  }

  avisar(visivel: boolean) {
    this.aoMudar([{ isIntersecting: visivel }])
  }
}

describe('CarregarMais (#92)', () => {
  beforeEach(() => {
    ObservadorFalso.criados = []
    vi.stubGlobal('IntersectionObserver', ObservadorFalso)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('carrega sozinho quando o fim da lista aparece, um pouco antes do fim', () => {
    const aoCarregar = vi.fn()
    render(
      <CarregarMais aoCarregar={aoCarregar} carregando={false} erro={null} />,
    )

    const [observador] = ObservadorFalso.criados
    expect(observador.observe).toHaveBeenCalledOnce()
    expect(observador.opcoes).toEqual({ rootMargin: '200px' })

    observador.avisar(false)
    expect(aoCarregar).not.toHaveBeenCalled()

    observador.avisar(true)
    expect(aoCarregar).toHaveBeenCalledOnce()
  })

  it('enquanto carrega, para de observar e mostra "Carregando…"', () => {
    const aoCarregar = vi.fn()
    const { rerender } = render(
      <CarregarMais aoCarregar={aoCarregar} carregando={false} erro={null} />,
    )
    const [observador] = ObservadorFalso.criados

    rerender(
      <CarregarMais aoCarregar={aoCarregar} carregando={true} erro={null} />,
    )

    expect(observador.disconnect).toHaveBeenCalledOnce()
    expect(ObservadorFalso.criados).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Carregando…' })).toBeDisabled()
  })

  it('com erro, não carrega sozinho: mostra o erro e o "Tentar de novo"', () => {
    render(
      <CarregarMais
        aoCarregar={vi.fn()}
        carregando={false}
        erro="Não foi possível carregar mais lançamentos."
      />,
    )

    expect(ObservadorFalso.criados).toHaveLength(0)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar mais lançamentos.',
    )
    expect(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    ).toBeInTheDocument()
  })

  it('para de observar ao sair da tela', () => {
    const { unmount } = render(
      <CarregarMais aoCarregar={vi.fn()} carregando={false} erro={null} />,
    )
    const [observador] = ObservadorFalso.criados

    unmount()

    expect(observador.disconnect).toHaveBeenCalledOnce()
  })
})
