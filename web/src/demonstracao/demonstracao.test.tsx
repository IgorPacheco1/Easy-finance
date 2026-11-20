import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderizarApp } from '../testes/renderizar.tsx'
import { servidor } from '../testes/servidor.ts'
import { respostasDaDemonstracao } from './api.ts'
import { FaixaDeDemonstracao } from './FaixaDeDemonstracao.tsx'
import { useRegisterSW } from './pwaDesligado.ts'

/**
 * O app inteiro com a API da demonstração (#162): o critério de aceite da issue é dar para
 * lançar, ver o mês, buscar e gerenciar categorias só com os dados de exemplo.
 */
describe('app na demonstração (#162)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 18, 10, 0))
    servidor.use(...respostasDaDemonstracao())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lança uma despesa e ela aparece no mês e na busca', async () => {
    const { usuario } = renderizarApp('/')
    await usuario.click(await screen.findByRole('button', { name: 'Mercado' }))
    for (const tecla of '2590') {
      await usuario.click(screen.getByRole('button', { name: tecla }))
    }
    await usuario.click(screen.getByRole('button', { name: 'Descrição' }))
    await usuario.type(screen.getByLabelText('Descrição (opcional)'), 'Padaria')
    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))
    await screen.findByRole('heading', { name: 'Despesa lançada' })

    await usuario.click(screen.getByRole('link', { name: 'Mês' }))
    expect(await screen.findByText('Padaria')).toBeInTheDocument()
    expect(screen.getByText('Saldo do mês')).toBeInTheDocument()

    await usuario.click(
      screen.getByRole('link', { name: 'Buscar lançamentos' }),
    )
    await usuario.type(
      await screen.findByRole('searchbox', { name: 'Buscar na descrição' }),
      'padaria',
    )
    const resultado = await screen.findByRole('link', { name: /Padaria/ })
    expect(resultado).toHaveTextContent('R$ 25,90')
  })

  it('cria uma categoria', async () => {
    const { usuario } = renderizarApp('/categorias')
    await screen.findByRole('button', { name: 'Nova' })

    await usuario.click(screen.getByRole('button', { name: 'Nova' }))
    await usuario.type(screen.getByLabelText('Nome'), 'Pets')
    await usuario.click(screen.getByRole('button', { name: 'Criar categoria' }))

    expect(await screen.findByText('Pets')).toBeInTheDocument()
  })

  it('a faixa avisa em todas as telas que é uma demonstração', () => {
    render(<FaixaDeDemonstracao />)

    // Uma região própria, que o leitor de tela lista junto com a navegação e o conteúdo.
    expect(
      within(
        screen.getByRole('complementary', { name: 'Demonstração' }),
      ).getByText(/nada é salvo/),
    ).toBeInTheDocument()
  })

  it('sem PWA, nunca há versão nova para avisar', async () => {
    const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW()

    expect(needRefresh[0]).toBe(false)
    expect(offlineReady[0]).toBe(false)
    needRefresh[1]()
    offlineReady[1]()
    await expect(updateServiceWorker()).resolves.toBeUndefined()
  })
})
