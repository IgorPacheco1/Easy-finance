import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AvisoDeAtualizacao } from './AvisoDeAtualizacao.tsx'

/**
 * O service worker só existe no build (ADR-0015). Aqui o módulo que fala com ele é trocado por
 * um falso (vi.mock), e cada teste diz se existe versão nova ou não.
 */
const sw = vi.hoisted(() => ({
  temVersaoNova: false,
  atualizar: vi.fn(),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.temVersaoNova, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: sw.atualizar,
  }),
}))

describe('aviso de versão nova', () => {
  beforeEach(() => {
    sw.temVersaoNova = false
    sw.atualizar.mockReset()
  })

  it('não aparece quando não há versão nova', () => {
    render(<AvisoDeAtualizacao />)

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('aparece com o botão Atualizar e não some sozinho', () => {
    vi.useFakeTimers()
    try {
      sw.temVersaoNova = true
      render(<AvisoDeAtualizacao />)

      vi.advanceTimersByTime(60_000) // um minuto depois...

      expect(screen.getByRole('status')).toHaveTextContent(
        'Nova versão do app disponível.',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('"Atualizar" troca para a versão nova e recarrega a página', async () => {
    sw.temVersaoNova = true
    render(<AvisoDeAtualizacao />)

    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }))

    // true = depois de trocar o service worker, recarregar a página.
    expect(sw.atualizar).toHaveBeenCalledWith(true)
  })
})
