import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respostasPadrao, SALARIO, transacao } from '../testes/dados.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'

/** Responde transações e saldo e guarda os períodos pedidos (parâmetros de e ate). */
function combinarMes(dados: {
  transacoes?: ReturnType<typeof transacao>[]
  saldo?: { receitas: number; despesas: number; saldo: number }
}) {
  const periodos: string[] = []
  servidor.use(
    http.get(`${API}/transacoes`, ({ request }) => {
      const p = new URL(request.url).searchParams
      periodos.push(`${p.get('de')}..${p.get('ate')}`)
      return HttpResponse.json(dados.transacoes ?? [])
    }),
    http.get(`${API}/saldo`, ({ request }) => {
      const p = new URL(request.url).searchParams
      return HttpResponse.json({
        de: p.get('de'),
        ate: p.get('ate'),
        receitas: 0,
        despesas: 0,
        saldo: 0,
        ...dados.saldo,
      })
    }),
  )
  return periodos
}

describe('tela do mês', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 5, 10, 0)) // quinta, 05/11/2026
    servidor.use(...respostasPadrao())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sem mês no endereço, abre o mês atual e pede o período certo à API', async () => {
    const periodos = combinarMes({})
    renderizarApp('/mes')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Novembro de 2026' }),
    ).toBeInTheDocument()
    await screen.findByText('Saldo do mês')
    expect(periodos).toEqual(['2026-11-01..2026-11-30'])
  })

  it('mostra o saldo e as transações agrupadas por dia, com o sinal do tipo', async () => {
    combinarMes({
      transacoes: [
        transacao({
          id: 'a',
          data: '2026-11-05',
          valor: 52.9,
          descricao: 'feira',
        }),
        transacao({
          id: 'b',
          data: '2026-11-04',
          valor: 3000,
          categoria: { id: SALARIO.id, nome: SALARIO.nome, tipo: SALARIO.tipo },
        }),
        transacao({ id: 'c', data: '2026-11-02', valor: 10 }),
      ],
      saldo: { receitas: 3000, despesas: 62.9, saldo: 2937.1 },
    })
    renderizarApp('/mes')

    const saldo = await screen.findByRole('region', { name: 'Saldo do mês' })
    expect(saldo).toHaveTextContent('R$ 2.937,10')
    expect(saldo).toHaveTextContent('R$ 3.000,00')
    expect(saldo).toHaveTextContent('R$ 62,90')

    const dias = screen.getAllByRole('heading', { level: 2 })
    expect(dias.map((dia) => dia.textContent)).toEqual([
      'Hoje, 05/11',
      'Ontem, 04/11',
      'Segunda, 02/11',
    ])
    expect(screen.getByText('feira')).toBeInTheDocument()
    expect(screen.getByText('− R$ 52,90')).toBeInTheDocument()
    expect(screen.getByText('+ R$ 3.000,00')).toBeInTheDocument()
  })

  it('mês sem lançamentos mostra a mensagem e o atalho para lançar', async () => {
    combinarMes({})
    renderizarApp('/mes?m=2026-10')

    expect(
      await screen.findByText('Nenhum lançamento em outubro de 2026.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lançar agora' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('as setas trocam o mês, no endereço e no pedido à API, atravessando o ano', async () => {
    const periodos = combinarMes({})
    const { usuario, roteador } = renderizarApp('/mes?m=2026-01')
    await screen.findByText('Saldo do mês')

    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Dezembro de 2025' }),
    ).toBeInTheDocument()
    expect(roteador.state.location.search).toBe('?m=2025-12')
    await screen.findByText('Saldo do mês')

    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }))

    expect(roteador.state.location.search).toBe('?m=2026-02')
    await screen.findByText('Saldo do mês')
    expect(periodos.at(-1)).toBe('2026-02-01..2026-02-28')
  })

  it('mês inválido no endereço abre o mês atual', async () => {
    combinarMes({})
    renderizarApp('/mes?m=2026-13')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Novembro de 2026' }),
    ).toBeInTheDocument()
    await screen.findByText('Saldo do mês')
  })

  it('se a API falha, mostra o erro e deixa tentar de novo', async () => {
    let falhar = true
    servidor.use(
      http.get(`${API}/transacoes`, () =>
        falhar ? HttpResponse.error() : HttpResponse.json([]),
      ),
    )
    const { usuario } = renderizarApp('/mes')

    const erro = await screen.findByRole('alert')
    expect(erro).toHaveTextContent('Não foi possível falar com o servidor.')

    falhar = false
    await usuario.click(
      within(erro).getByRole('button', { name: 'Tentar de novo' }),
    )

    expect(await screen.findByText('Saldo do mês')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
