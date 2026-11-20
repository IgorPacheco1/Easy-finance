import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MERCADO,
  pagina,
  respostasPadrao,
  resumo,
  resumoDiario,
  SALARIO,
  transacao,
  USUARIO,
} from '../testes/dados.ts'
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
    // Com gasto no mês, para o gráfico de gasto por dia (#189) aparecer, com a tabela aberta.
    servidor.use(
      http.get(`${API}/resumo/diario`, () =>
        HttpResponse.json(
          resumoDiario('2026-11-01', '2026-11-30', {
            '2026-11-03': 52.9,
            '2026-11-12': 180,
          }),
        ),
      ),
    )
    const { usuario } = renderizarApp('/mes')
    await screen.findByText('feira')
    await usuario.click(await screen.findByText('Ver dia a dia'))

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

  it('Mês vazio (#196)', async () => {
    renderizarApp('/mes')
    await screen.findByText(/^Nenhum lançamento em/)

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Buscar sem resultado (#196)', async () => {
    renderizarApp('/buscar?descricao=uber')
    await screen.findByText('Nada encontrado')

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Buscar, com o painel de filtros aberto', async () => {
    const { usuario } = renderizarApp('/buscar')
    await screen.findByText('Nenhum lançamento ainda')
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

  it('Categorias, com e sem movimento no mês (#191)', async () => {
    servidor.use(
      http.get(`${API}/resumo`, () =>
        HttpResponse.json(
          resumo({
            despesas: [
              {
                id: MERCADO.id,
                nome: MERCADO.nome,
                icone: MERCADO.icone,
                cor: MERCADO.cor,
                total: 52.9,
                quantidade: 1,
                percentual: 100,
              },
            ],
          }),
        ),
      ),
    )
    renderizarApp('/categorias')
    await screen.findByRole('region', { name: 'Com gastos no mês' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Categorias, com a folha de editar aberta (#192)', async () => {
    const { usuario } = renderizarApp('/categorias')
    await usuario.click(
      await screen.findByRole('button', { name: 'Editar Transporte' }),
    )
    await screen.findByRole('dialog', { name: 'Editar categoria' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Conta, com o perfil e os números (#194)', async () => {
    renderizarApp('/conta')
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await screen.findByText('42')

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Entrar', async () => {
    renderizarApp('/entrar', ANONIMO)
    await screen.findByRole('heading', { level: 1, name: 'Entrar' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Conta, com a folha de editar o perfil aberta (#194)', async () => {
    const { usuario } = renderizarApp('/conta')
    await usuario.click(
      await screen.findByRole('button', { name: 'Editar perfil' }),
    )
    await screen.findByRole('dialog', { name: 'Editar perfil' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Trocar senha (#194)', async () => {
    renderizarApp('/conta/senha')
    await screen.findByRole('heading', { level: 1, name: 'Trocar senha' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Pedir o nome (#194)', async () => {
    servidor.use(
      http.get(`${API}/eu`, () =>
        HttpResponse.json({ ...USUARIO, nome: null }),
      ),
    )
    renderizarApp('/', {
      situacao: 'logado',
      usuario: { ...USUARIO, nome: null },
      confirmada: true,
    })
    await screen.findByRole('heading', {
      level: 1,
      name: 'Como podemos te chamar?',
    })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Criar conta', async () => {
    renderizarApp('/criar-conta', ANONIMO)
    await screen.findByRole('heading', { level: 1 })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
