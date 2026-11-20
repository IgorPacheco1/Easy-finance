import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pagina, respostasPadrao, SALARIO, transacao } from '../testes/dados.ts'
import { violacoesDeAcessibilidade } from '../testes/acessibilidade.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'

const ANONIMO = { situacao: 'anonimo' } as const

describe('acessibilidade das telas (#154)', () => {
  beforeEach(() => {
    servidor.use(...respostasPadrao())
  })

  it('Lançar', async () => {
    renderizarApp('/')
    await screen.findByRole('button', { name: 'Mercado' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Lançar, na confirmação (#187)', async () => {
    servidor.use(
      http.post(`${API}/transacoes`, () =>
        HttpResponse.json(transacao(), { status: 201 }),
      ),
    )
    const { usuario } = renderizarApp('/')
    await usuario.click(await screen.findByRole('button', { name: 'Mercado' }))
    await usuario.click(screen.getByRole('button', { name: '5' }))
    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))
    await screen.findByRole('definition') // o saldo, que chega por último

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Mês, com lançamentos', async () => {
    servidor.use(
      http.get(`${API}/transacoes`, () =>
        HttpResponse.json(
          pagina(
            [
              transacao({ id: 'a', descricao: 'feira' }),
              transacao({
                id: 'b',
                categoria: {
                  id: SALARIO.id,
                  nome: SALARIO.nome,
                  tipo: SALARIO.tipo,
                  icone: SALARIO.icone,
                  cor: SALARIO.cor,
                },
              }),
            ],
            { temMais: true },
          ),
        ),
      ),
    )
    renderizarApp('/mes')
    await screen.findByText('feira')

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Mês com os valores escondidos (#188)', async () => {
    servidor.use(
      http.get(`${API}/transacoes`, () =>
        HttpResponse.json(pagina([transacao({ id: 'a', descricao: 'feira' })])),
      ),
    )
    const { usuario } = renderizarApp('/mes')
    await screen.findByText('feira')
    await usuario.click(
      screen.getByRole('button', { name: 'Esconder valores' }),
    )

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Mês no computador, com a navegação lateral e o link de pular (#161)', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    try {
      renderizarApp('/mes')
      await screen.findByText('Saldo do mês')

      expect(await violacoesDeAcessibilidade()).toEqual([])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('Buscar, com o painel de filtros aberto', async () => {
    const { usuario } = renderizarApp('/buscar')
    await screen.findByText('Nenhum lançamento ainda.')
    await usuario.click(screen.getByRole('button', { name: 'Filtros' }))
    await screen.findByRole('form', { name: 'Filtros' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Editar lançamento, com a confirmação de exclusão aberta', async () => {
    servidor.use(
      http.get(`${API}/transacoes/:id`, () =>
        HttpResponse.json(transacao({ id: 'a', descricao: 'feira' })),
      ),
    )
    const { usuario } = renderizarApp('/lancamentos/a')
    await screen.findByRole('button', { name: 'Mercado', pressed: true })
    await usuario.click(
      screen.getByRole('button', { name: 'Excluir lançamento' }),
    )

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Categorias', async () => {
    renderizarApp('/categorias')
    await screen.findByText('Salário')

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Conta', async () => {
    renderizarApp('/conta')
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Entrar', async () => {
    renderizarApp('/entrar', ANONIMO)
    await screen.findByRole('heading', { level: 1, name: 'Entrar' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Criar conta', async () => {
    renderizarApp('/criar-conta', ANONIMO)
    await screen.findByRole('heading', { level: 1 })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
