import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  pagina,
  respostasPadrao,
  resumo,
  SALARIO,
  transacao,
} from '../testes/dados.ts'
import { guardarNaFila } from '../fila/banco.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'

/**
 * Responde transações e saldo e guarda os pedidos de transações (período e página).
 * `paginas` simula a paginação da API: a página N devolve `paginas[N - 1]`, e `temMais` é true
 * enquanto houver uma página depois dela. Com só `transacoes`, tudo vem numa página.
 */
function combinarMes(dados: {
  transacoes?: ReturnType<typeof transacao>[]
  paginas?: ReturnType<typeof transacao>[][]
  saldo?: { receitas: number; despesas: number; saldo: number }
}) {
  const periodos: string[] = []
  const pedidos: string[] = []
  const paginas = dados.paginas ?? [dados.transacoes ?? []]
  servidor.use(
    http.get(`${API}/transacoes`, ({ request }) => {
      const p = new URL(request.url).searchParams
      periodos.push(`${p.get('de')}..${p.get('ate')}`)
      pedidos.push(`pagina=${p.get('pagina')}&tamanho=${p.get('tamanho')}`)
      const numero = Number(p.get('pagina'))
      return HttpResponse.json(
        pagina(paginas[numero - 1] ?? [], {
          pagina: numero,
          temMais: numero < paginas.length,
        }),
      )
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
  return { periodos, pedidos }
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
    const { periodos, pedidos } = combinarMes({})
    renderizarApp('/mes')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Novembro de 2026' }),
    ).toBeInTheDocument()
    await screen.findByText('Saldo do mês')
    expect(periodos).toEqual(['2026-11-01..2026-11-30'])
    expect(pedidos).toEqual(['pagina=1&tamanho=50'])
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

    // O primeiro h2 é o do resumo por categoria (#96); depois vêm os dias.
    const dias = screen.getAllByRole('heading', { level: 2 })
    expect(dias.map((dia) => dia.textContent)).toEqual([
      'Por categoria',
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
    const { periodos } = combinarMes({})
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
        falhar ? HttpResponse.error() : HttpResponse.json(pagina([])),
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
  describe('rolagem infinita (#92)', () => {
    it('com uma página só, não mostra "Carregar mais"', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      renderizarApp('/mes')

      await screen.findByText('Saldo do mês')
      expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull()
    })

    it('carrega a próxima página no fim da lista e junta no fim, até acabar', async () => {
      const { pedidos } = combinarMes({
        paginas: [
          [transacao({ id: 'a', data: '2026-11-05', descricao: 'pão' })],
          [transacao({ id: 'b', data: '2026-11-03', descricao: 'gasolina' })],
        ],
      })
      const { usuario } = renderizarApp('/mes')

      await screen.findByText('pão')
      expect(screen.queryByText('gasolina')).toBeNull()

      await usuario.click(screen.getByRole('button', { name: 'Carregar mais' }))

      expect(await screen.findByText('gasolina')).toBeInTheDocument()
      expect(screen.getByText('pão')).toBeInTheDocument()
      expect(pedidos).toEqual(['pagina=1&tamanho=50', 'pagina=2&tamanho=50'])
      // Era a última página: o botão some.
      expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull()
    })

    it('não repete um lançamento que veio nas duas páginas', async () => {
      // Acontece quando um lançamento novo entra enquanto a pessoa rola a lista.
      combinarMes({
        paginas: [
          [transacao({ id: 'a', descricao: 'pão' })],
          [
            transacao({ id: 'a', descricao: 'pão' }),
            transacao({ id: 'b', descricao: 'leite' }),
          ],
        ],
      })
      const { usuario } = renderizarApp('/mes')
      await screen.findByText('pão')

      await usuario.click(screen.getByRole('button', { name: 'Carregar mais' }))

      await screen.findByText('leite')
      expect(screen.getAllByText('pão')).toHaveLength(1)
    })

    it('se a próxima página falha, mantém a lista e deixa tentar de novo', async () => {
      let falhar = true
      combinarMes({
        paginas: [
          [transacao({ id: 'a', descricao: 'pão' })],
          [transacao({ id: 'b', descricao: 'leite' })],
        ],
      })
      servidor.use(
        http.get(`${API}/transacoes`, ({ request }) => {
          const numero = Number(new URL(request.url).searchParams.get('pagina'))
          if (numero === 1) {
            return HttpResponse.json(
              pagina([transacao({ id: 'a', descricao: 'pão' })], {
                temMais: true,
              }),
            )
          }
          return falhar
            ? HttpResponse.error()
            : HttpResponse.json(
                pagina([transacao({ id: 'b', descricao: 'leite' })], {
                  pagina: 2,
                }),
              )
        }),
      )
      const { usuario } = renderizarApp('/mes')
      await screen.findByText('pão')

      await usuario.click(screen.getByRole('button', { name: 'Carregar mais' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível falar com o servidor.',
      )
      expect(screen.getByText('pão')).toBeInTheDocument()

      falhar = false
      await usuario.click(
        screen.getByRole('button', { name: 'Tentar de novo' }),
      )

      expect(await screen.findByText('leite')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })
  describe('resumo por categoria (#96)', () => {
    const MERCADO_NO_RESUMO = {
      id: 'm',
      nome: 'Mercado',
      total: 800,
      quantidade: 12,
      percentual: 61.5,
    }
    const TRANSPORTE_NO_RESUMO = {
      id: 't',
      nome: 'Transporte',
      total: 500,
      quantidade: 9,
      percentual: 38.5,
    }

    it('mostra as despesas por categoria com valor e percentual escritos', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      servidor.use(
        http.get(`${API}/resumo`, () =>
          HttpResponse.json(
            resumo({ despesas: [MERCADO_NO_RESUMO, TRANSPORTE_NO_RESUMO] }),
          ),
        ),
      )
      renderizarApp('/mes')

      const secao = await screen.findByRole('region', { name: 'Por categoria' })
      const linhas = await within(secao).findAllByRole('listitem')
      expect(linhas).toHaveLength(2)
      expect(linhas[0]).toHaveTextContent('Mercado')
      expect(linhas[0]).toHaveTextContent('R$ 800,00')
      expect(linhas[0]).toHaveTextContent('61,5%')
      expect(linhas[1]).toHaveTextContent('Transporte')
      expect(linhas[1]).toHaveTextContent('38,5%')
      expect(
        within(secao).getByRole('button', { name: 'Despesas' }),
      ).toHaveAttribute('aria-pressed', 'true')
    })

    it('troca para as receitas', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      servidor.use(
        http.get(`${API}/resumo`, () =>
          HttpResponse.json(
            resumo({
              despesas: [MERCADO_NO_RESUMO],
              receitas: [
                {
                  id: 's',
                  nome: 'Salário',
                  total: 3000,
                  quantidade: 1,
                  percentual: 100,
                },
              ],
            }),
          ),
        ),
      )
      const { usuario } = renderizarApp('/mes')
      const secao = await screen.findByRole('region', { name: 'Por categoria' })
      await within(secao).findByText('Mercado')

      await usuario.click(
        within(secao).getByRole('button', { name: 'Receitas' }),
      )

      expect(within(secao).getByText('Salário')).toBeInTheDocument()
      expect(within(secao).getByText('100,0%')).toBeInTheDocument()
      expect(within(secao).queryByText('Mercado')).toBeNull()
    })

    it('tipo sem lançamento no mês mostra a mensagem', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      servidor.use(
        http.get(`${API}/resumo`, () =>
          HttpResponse.json(resumo({ despesas: [MERCADO_NO_RESUMO] })),
        ),
      )
      const { usuario } = renderizarApp('/mes')
      const secao = await screen.findByRole('region', { name: 'Por categoria' })
      await within(secao).findByText('Mercado')

      await usuario.click(
        within(secao).getByRole('button', { name: 'Receitas' }),
      )

      expect(
        within(secao).getByText('Nenhuma receita neste mês.'),
      ).toBeInTheDocument()
    })

    it('mês vazio não mostra o resumo', async () => {
      combinarMes({})
      renderizarApp('/mes')

      await screen.findByText('Nenhum lançamento em novembro de 2026.')
      expect(screen.queryByRole('region', { name: 'Por categoria' })).toBeNull()
    })

    it('se só o resumo falha, a lista continua e o resumo deixa tentar de novo', async () => {
      let falhar = true
      combinarMes({ transacoes: [transacao({ id: 'a', descricao: 'pão' })] })
      servidor.use(
        http.get(`${API}/resumo`, () =>
          falhar
            ? HttpResponse.error()
            : HttpResponse.json(resumo({ despesas: [MERCADO_NO_RESUMO] })),
        ),
      )
      const { usuario } = renderizarApp('/mes')

      const secao = await screen.findByRole('region', { name: 'Por categoria' })
      const erro = await within(secao).findByRole('alert')
      expect(erro).toHaveTextContent('Não foi possível falar com o servidor.')
      expect(screen.getByText('pão')).toBeInTheDocument()

      falhar = false
      await usuario.click(
        within(erro).getByRole('button', { name: 'Tentar de novo' }),
      )

      expect(await within(secao).findByText('Mercado')).toBeInTheDocument()
    })
  })
  describe('lançamentos guardados no aparelho (#100)', () => {
    it('mostra quantos estão aguardando envio, fora da lista e do saldo', async () => {
      await guardarNaFila({
        id: 'guardado',
        valor: 10,
        data: '2026-11-05',
        categoriaId: SALARIO.id,
      })
      servidor.use(http.post(`${API}/transacoes`, () => HttpResponse.error()))
      combinarMes({})
      renderizarApp('/mes')

      expect(
        await screen.findByText('1 lançamento aguardando envio.'),
      ).toBeInTheDocument()
      // O mês continua vazio: o pendente não entra na lista nem no saldo.
      expect(
        screen.getByText('Nenhum lançamento em novembro de 2026.'),
      ).toBeInTheDocument()
    })

    it('quando o pendente chega ao servidor, o mês é buscado de novo', async () => {
      await guardarNaFila({
        id: 'guardado',
        valor: 10,
        data: '2026-11-05',
        categoriaId: SALARIO.id,
      })
      servidor.use(
        http.post(`${API}/transacoes`, () =>
          HttpResponse.json(transacao({ id: 'guardado' }), { status: 201 }),
        ),
      )
      const { periodos } = combinarMes({})
      renderizarApp('/mes')

      await waitFor(() => expect(periodos.length).toBeGreaterThanOrEqual(2))
      expect(screen.queryByText(/aguardando envio/)).toBeNull()
    })
  })
})
