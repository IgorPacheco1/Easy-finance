import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  pagina,
  respostasPadrao,
  resumo,
  resumoDiario,
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
    await screen.findByText('Nenhum lançamento em novembro de 2026')
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
          categoria: {
            id: SALARIO.id,
            nome: SALARIO.nome,
            tipo: SALARIO.tipo,
            icone: SALARIO.icone,
            cor: SALARIO.cor,
          },
        }),
        transacao({ id: 'c', data: '2026-11-02', valor: 10 }),
      ],
      saldo: { receitas: 3000, despesas: 62.9, saldo: 2937.1 },
    })
    renderizarApp('/mes')

    const saldo = await screen.findByRole('region', { name: 'Saldo do mês' })
    expect(await within(saldo).findByText('R$ 2.937,10')).toBeInTheDocument()
    expect(saldo).toHaveTextContent('R$ 3.000,00')
    expect(saldo).toHaveTextContent('R$ 62,90')
    await screen.findByText('feira')

    // Os primeiros h2 são o do gasto por dia (#189) e o do resumo por categoria (#96); depois
    // vêm os dias.
    const dias = screen.getAllByRole('heading', { level: 2 })
    expect(dias.map((dia) => dia.textContent)).toEqual([
      'Gasto por dia',
      'Por categoria',
      'Hoje',
      'Ontem',
      'Segunda, 2 de novembro',
    ])
    expect(screen.getByText('feira')).toBeInTheDocument()
    expect(screen.getByText('− R$ 52,90')).toBeInTheDocument()
    expect(screen.getByText('+ R$ 3.000,00')).toBeInTheDocument()
  })

  it('mês sem lançamentos mostra a tela vazia com o atalho para lançar (#196)', async () => {
    combinarMes({})
    renderizarApp('/mes?m=2026-10')

    expect(
      await screen.findByText('Nenhum lançamento em outubro de 2026'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Que tal registrar o primeiro?'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lançar agora' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('as setas trocam o mês, no endereço e no pedido à API, atravessando o ano', async () => {
    const { periodos } = combinarMes({})
    const { usuario, roteador } = renderizarApp('/mes?m=2026-01')
    await screen.findByText('Nenhum lançamento em janeiro de 2026')

    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Dezembro de 2025' }),
    ).toBeInTheDocument()
    expect(roteador.state.location.search).toBe('?m=2025-12')
    await screen.findByText('Nenhum lançamento em dezembro de 2025')

    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }))

    expect(roteador.state.location.search).toBe('?m=2026-02')
    await screen.findByText('Nenhum lançamento em fevereiro de 2026')
    expect(periodos.at(-1)).toBe('2026-02-01..2026-02-28')
  })

  it('mês inválido no endereço abre o mês atual', async () => {
    combinarMes({})
    renderizarApp('/mes?m=2026-13')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Novembro de 2026' }),
    ).toBeInTheDocument()
    await screen.findByText('Nenhum lançamento em novembro de 2026')
  })

  it('se só a lista falha, o saldo continua e a lista deixa tentar de novo', async () => {
    let falhar = true
    combinarMes({ saldo: { receitas: 0, despesas: 40, saldo: -40 } })
    servidor.use(
      http.get(`${API}/transacoes`, () =>
        falhar ? HttpResponse.error() : HttpResponse.json(pagina([])),
      ),
    )
    const { usuario } = renderizarApp('/mes')

    const erro = await screen.findByRole('alert')
    expect(erro).toHaveTextContent('Não foi possível falar com o servidor.')
    const saldo = screen.getByRole('region', { name: 'Saldo do mês' })
    expect(await within(saldo).findByText('R$ 40,00')).toBeInTheDocument()

    falhar = false
    await usuario.click(
      within(erro).getByRole('button', { name: 'Tentar de novo' }),
    )

    expect(
      await screen.findByText('Nenhum lançamento em novembro de 2026'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('se só o saldo falha, a lista continua e o saldo deixa tentar de novo', async () => {
    let falhar = true
    let pedidosDeSaldo = 0
    const { pedidos } = combinarMes({
      transacoes: [transacao({ id: 'a', descricao: 'pão' })],
    })
    servidor.use(
      http.get(`${API}/saldo`, ({ request }) => {
        pedidosDeSaldo++
        const p = new URL(request.url).searchParams
        return falhar
          ? HttpResponse.error()
          : HttpResponse.json({
              de: p.get('de'),
              ate: p.get('ate'),
              receitas: 0,
              despesas: 12.9,
              saldo: -12.9,
            })
      }),
    )
    const { usuario } = renderizarApp('/mes')

    const saldo = await screen.findByRole('region', { name: 'Saldo do mês' })
    const erro = await within(saldo).findByRole('alert')
    expect(erro).toHaveTextContent('Não foi possível falar com o servidor.')
    expect(await screen.findByText('pão')).toBeInTheDocument()

    falhar = false
    await usuario.click(
      within(erro).getByRole('button', { name: 'Tentar de novo' }),
    )

    expect(await within(saldo).findByText('R$ 12,90')).toBeInTheDocument()
    expect(within(saldo).queryByRole('alert')).toBeNull()
    expect(pedidosDeSaldo).toBe(2)
    // O "Tentar de novo" do saldo pede só o saldo: a lista não é buscada de novo.
    expect(pedidos).toEqual(['pagina=1&tamanho=50'])
  })
  describe('rolagem infinita (#92)', () => {
    it('com uma página só, não mostra "Carregar mais"', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a', descricao: 'pão' })] })
      renderizarApp('/mes')

      await screen.findByText('pão')
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
      icone: 'shopping-cart',
      cor: 'verde',
      total: 800,
      quantidade: 12,
      percentual: 61.5,
    }
    const TRANSPORTE_NO_RESUMO = {
      id: 't',
      nome: 'Transporte',
      icone: 'car',
      cor: 'azul',
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

    it('mostra a rosca com o total, o maior gasto e a quantidade de lançamentos (#190)', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      const categorias = [400, 300, 200, 150, 100, 30, 20].map((total, i) => ({
        ...MERCADO_NO_RESUMO,
        id: `c${i}`,
        nome: `Categoria ${i + 1}`,
        total,
        quantidade: i + 1,
        percentual: total / 12,
      }))
      servidor.use(
        http.get(`${API}/resumo`, () =>
          HttpResponse.json(resumo({ despesas: categorias })),
        ),
      )
      renderizarApp('/mes')

      const secao = await screen.findByRole('region', { name: 'Por categoria' })
      expect(await within(secao).findByText(/^Maior gasto:/)).toHaveTextContent(
        'Maior gasto: Categoria 1, R$ 400,00 (33,3%)',
      )
      expect(within(secao).getByText('R$ 1.200,00')).toBeInTheDocument()
      // 5 fatias com nome, "Outras" com o resto e o círculo do fundo.
      expect(
        secao.querySelectorAll('svg[viewBox="0 0 42 42"] circle'),
      ).toHaveLength(7)
      const linhas = within(secao).getAllByRole('listitem')
      expect(linhas).toHaveLength(7) // a lista continua com todas
      expect(linhas[0]).toHaveTextContent('1 lançamento')
      expect(linhas[1]).toHaveTextContent('2 lançamentos')
    })

    it('nas receitas, o destaque é a maior receita', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      servidor.use(
        http.get(`${API}/resumo`, () =>
          HttpResponse.json(
            resumo({
              receitas: [
                { ...MERCADO_NO_RESUMO, nome: 'Salário', percentual: 100 },
              ],
            }),
          ),
        ),
      )
      const { usuario } = renderizarApp('/mes')
      const secao = await screen.findByRole('region', { name: 'Por categoria' })
      await within(secao).findByText('Nenhuma despesa neste mês.')

      await usuario.click(
        within(secao).getByRole('button', { name: 'Receitas' }),
      )

      expect(within(secao).getByText(/^Maior receita:/)).toHaveTextContent(
        'Maior receita: Salário, R$ 800,00 (100,0%)',
      )
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
                  icone: 'wallet',
                  cor: 'menta',
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
      await within(secao).findAllByText('Mercado')

      await usuario.click(
        within(secao).getByRole('button', { name: 'Receitas' }),
      )

      expect(within(secao).getAllByText('Salário')).not.toHaveLength(0)
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
      await within(secao).findAllByText('Mercado')

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

      await screen.findByText('Nenhum lançamento em novembro de 2026')
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

      expect(await within(secao).findAllByText('Mercado')).not.toHaveLength(0)
    })
  })
  describe('olho, números que contam e comparação (#188)', () => {
    const SALDO = { receitas: 3000, despesas: 62.9, saldo: 2937.1 }
    const MERCADO_NO_RESUMO = {
      id: 'm',
      nome: 'Mercado',
      icone: 'shopping-cart',
      cor: 'verde',
      total: 62.9,
      quantidade: 1,
      percentual: 100,
    }

    /** /resumo responde conforme o período pedido; guarda os períodos. */
    function resumoPorPeriodo(
      despesasPorPeriodo: Record<string, number[]>,
    ): string[] {
      const periodos: string[] = []
      servidor.use(
        http.get(`${API}/resumo`, ({ request }) => {
          const p = new URL(request.url).searchParams
          const chave = `${p.get('de')}..${p.get('ate')}`
          periodos.push(chave)
          const [mercado = 0, transporte = 0] = despesasPorPeriodo[chave] ?? []
          return HttpResponse.json(
            resumo({
              de: p.get('de'),
              ate: p.get('ate'),
              despesas: [
                { ...MERCADO_NO_RESUMO, total: mercado },
                {
                  ...MERCADO_NO_RESUMO,
                  id: 't',
                  nome: 'Transporte',
                  total: transporte,
                },
              ].filter((c) => c.total > 0),
            }),
          )
        }),
      )
      return periodos
    }

    it('o cabeçalho mostra o mês em destaque e o ano embaixo', async () => {
      combinarMes({})
      renderizarApp('/mes')

      const titulo = screen.getByRole('heading', {
        level: 1,
        name: 'Novembro de 2026',
      })
      expect(within(titulo).getByText('Novembro')).toBeInTheDocument()
      expect(within(titulo).getByText('2026')).toBeInTheDocument()
    })

    it('o olho esconde todos os valores da tela e mostra de novo', async () => {
      combinarMes({
        transacoes: [transacao({ id: 'a', valor: 62.9, descricao: 'feira' })],
        saldo: SALDO,
      })
      servidor.use(
        http.get(`${API}/resumo`, () =>
          HttpResponse.json(resumo({ despesas: [MERCADO_NO_RESUMO] })),
        ),
      )
      const { usuario } = renderizarApp('/mes')
      const saldo = await screen.findByRole('region', { name: 'Saldo do mês' })
      await within(saldo).findByText('R$ 2.937,10')
      const secao = await screen.findByRole('region', { name: 'Por categoria' })
      await within(secao).findAllByText('R$ 62,90')
      await screen.findByText('feira')
      const olho = within(saldo).getByRole('button', {
        name: 'Esconder valores',
      })
      expect(olho).toHaveAttribute('aria-pressed', 'false')

      await usuario.click(olho)

      expect(olho).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByText(/R\$ \d/)).toBeNull()
      expect(within(saldo).getAllByText('valor escondido')).toHaveLength(3)
      // Total no centro da rosca, maior gasto e a linha da categoria.
      expect(within(secao).getAllByText('valor escondido')).toHaveLength(3)
      expect(screen.getByText('− R$ •••••')).toBeInTheDocument()

      await usuario.click(olho)

      expect(olho).toHaveAttribute('aria-pressed', 'false')
      expect(within(saldo).getByText('R$ 2.937,10')).toBeInTheDocument()
      expect(screen.getByText('− R$ 62,90')).toBeInTheDocument()
      expect(screen.queryByText('valor escondido')).toBeNull()
    })

    describe('números que contam', () => {
      afterEach(() => {
        Reflect.deleteProperty(window, 'matchMedia')
      })

      function movimento(reduzido: boolean) {
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          value: (consulta: string) => ({
            matches: reduzido && consulta.includes('reduce'),
            addEventListener: () => {},
            removeEventListener: () => {},
          }),
        })
      }

      it('o saldo conta até o valor; enquanto conta, o leitor de tela ouve só o final', async () => {
        movimento(false)
        const quadros = vi.spyOn(window, 'requestAnimationFrame')
        combinarMes({ saldo: SALDO })
        renderizarApp('/mes')
        const saldo = await screen.findByRole('region', {
          name: 'Saldo do mês',
        })

        await waitFor(() => expect(quadros).toHaveBeenCalled())
        // Terminada a contagem, sobra um texto só, sem os números do meio.
        await waitFor(() =>
          expect(
            saldo.querySelector('[aria-hidden="true"]:not(svg)'),
          ).toBeNull(),
        )
        expect(within(saldo).getByText('R$ 2.937,10')).toBeInTheDocument()
        quadros.mockRestore()
      })

      it('com "reduzir movimento", o valor aparece direto, sem contar', async () => {
        movimento(true)
        const quadros = vi.spyOn(window, 'requestAnimationFrame')
        combinarMes({ saldo: SALDO })
        renderizarApp('/mes')
        const saldo = await screen.findByRole('region', {
          name: 'Saldo do mês',
        })

        expect(
          await within(saldo).findByText('R$ 2.937,10'),
        ).toBeInTheDocument()
        expect(quadros).not.toHaveBeenCalled()
        quadros.mockRestore()
      })
    })

    it('no mês atual, compara com o mesmo período do mês anterior', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      const periodos = resumoPorPeriodo({
        '2026-11-01..2026-11-05': [60, 28],
        '2026-10-01..2026-10-05': [90, 10],
      })
      renderizarApp('/mes')

      expect(
        await screen.findByText(
          'Você gastou 12% menos que no mesmo período de outubro de 2026. A maior mudança foi em Mercado.',
        ),
      ).toBeInTheDocument()
      expect(periodos).toEqual(
        expect.arrayContaining([
          '2026-11-01..2026-11-30', // o resumo do mês
          '2026-11-01..2026-11-05',
          '2026-10-01..2026-10-05',
        ]),
      )
    })

    it('num mês passado, compara mês inteiro com mês inteiro', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a', data: '2026-10-10' })] })
      resumoPorPeriodo({
        '2026-10-01..2026-10-31': [150],
        '2026-09-01..2026-09-30': [100],
      })
      renderizarApp('/mes?m=2026-10')

      expect(
        await screen.findByText(
          'Você gastou 50% mais que em setembro de 2026.',
        ),
      ).toBeInTheDocument()
    })

    it('sem gasto no mês anterior, ou num mês futuro, a comparação não aparece', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      const periodos = resumoPorPeriodo({ '2026-11-01..2026-11-05': [60] })
      renderizarApp('/mes')
      await waitFor(() => expect(periodos).toHaveLength(3))
      await screen.findByRole('region', { name: 'Por categoria' })
      expect(screen.queryByText(/Você gastou|Seus gastos/)).toBeNull()

      cleanup()
      const doFuturo = resumoPorPeriodo({})
      renderizarApp('/mes?m=2026-12')
      const resumoDoFuturo = await screen.findByRole('region', {
        name: 'Por categoria',
      })
      await within(resumoDoFuturo).findByText('Nenhuma despesa neste mês.')
      // Só o resumo do próprio mês; nada de comparação.
      expect(doFuturo).toEqual(['2026-12-01..2026-12-31'])
    })

    it('se o resumo da comparação falha, a frase só não aparece', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a', descricao: 'pão' })] })
      servidor.use(http.get(`${API}/resumo`, () => HttpResponse.error()))
      renderizarApp('/mes')

      expect(await screen.findByText('pão')).toBeInTheDocument()
      const secao = await screen.findByRole('region', { name: 'Por categoria' })
      await within(secao).findByRole('alert')
      expect(screen.queryByText(/Você gastou|Seus gastos/)).toBeNull()
    })
  })

  describe('gasto por dia (#189)', () => {
    function gastos(dados: Record<string, number>) {
      const periodos: string[] = []
      servidor.use(
        http.get(`${API}/resumo/diario`, ({ request }) => {
          const p = new URL(request.url).searchParams
          const de = p.get('de') ?? ''
          const ate = p.get('ate') ?? ''
          periodos.push(`${de}..${ate}`)
          return HttpResponse.json(resumoDiario(de, ate, dados))
        }),
      )
      return periodos
    }

    it('no mês atual, a média divide pelos dias até hoje; a tabela marca hoje', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      // Até o dia 5: 150 no total, 30 por dia (e não 5 por dia, dividindo pelo mês inteiro).
      const periodos = gastos({ '2026-11-02': 100, '2026-11-05': 50 })
      const { usuario } = renderizarApp('/mes')

      const secao = await screen.findByRole('region', { name: 'Gasto por dia' })
      expect(
        await within(secao).findByText(/Média de R\$ 30,00 por dia\./),
      ).toHaveTextContent(
        'Média de R$ 30,00 por dia. O dia com mais gasto foi 02/11, com R$ 100,00.',
      )
      expect(periodos).toEqual(['2026-11-01..2026-11-30'])

      await usuario.click(within(secao).getByText('Ver dia a dia'))
      const tabela = within(secao).getByRole('table', {
        name: 'Gasto de cada dia do mês',
      })
      expect(within(tabela).getAllByRole('row')).toHaveLength(31) // cabeçalho + 30 dias
      expect(
        within(tabela).getByRole('rowheader', { name: '05/11 (hoje)' }),
      ).toBeInTheDocument()
      expect(
        within(secao).getByText('Hoje', { selector: 'li' }),
      ).toBeInTheDocument()
    })

    it('num mês passado, a média divide pelo mês inteiro e não há "hoje"', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a', data: '2026-10-10' })] })
      gastos({ '2026-10-10': 310 })
      renderizarApp('/mes?m=2026-10')

      const secao = await screen.findByRole('region', { name: 'Gasto por dia' })
      expect(
        await within(secao).findByText(/Média de R\$ 10,00 por dia\./),
      ).toBeInTheDocument()
      expect(within(secao).queryByText('Hoje', { selector: 'li' })).toBeNull()
    })

    it('num mês futuro com gasto marcado, mostra o dia de maior gasto, sem média', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a', data: '2026-12-24' })] })
      gastos({ '2026-12-24': 80 })
      renderizarApp('/mes?m=2026-12')

      const secao = await screen.findByRole('region', { name: 'Gasto por dia' })
      expect(
        await within(secao).findByText(
          'O dia com mais gasto foi 24/12, com R$ 80,00.',
        ),
      ).toBeInTheDocument()
      expect(within(secao).queryByText(/Média/)).toBeNull()
    })

    it('mês só com receitas diz que não houve despesa', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      renderizarApp('/mes')

      const secao = await screen.findByRole('region', { name: 'Gasto por dia' })
      expect(
        await within(secao).findByText('Nenhuma despesa neste mês.'),
      ).toBeInTheDocument()
    })

    it('o olho também esconde os valores do gasto por dia', async () => {
      combinarMes({ transacoes: [transacao({ id: 'a' })] })
      gastos({ '2026-11-02': 100 })
      const { usuario } = renderizarApp('/mes')
      const secao = await screen.findByRole('region', { name: 'Gasto por dia' })
      await within(secao).findByText(/Média de/)

      await usuario.click(
        screen.getByRole('button', { name: 'Esconder valores' }),
      )

      expect(within(secao).queryByText(/R\$ \d/)).toBeNull()
      expect(
        within(secao).getAllByText('valor escondido').length,
      ).toBeGreaterThan(2)
    })

    it('se só o gasto por dia falha, o resto continua e ele deixa tentar de novo', async () => {
      let falhar = true
      combinarMes({ transacoes: [transacao({ id: 'a', descricao: 'pão' })] })
      servidor.use(
        http.get(`${API}/resumo/diario`, ({ request }) => {
          const p = new URL(request.url).searchParams
          return falhar
            ? HttpResponse.error()
            : HttpResponse.json(
                resumoDiario(p.get('de') ?? '', p.get('ate') ?? '', {
                  '2026-11-03': 20,
                }),
              )
        }),
      )
      const { usuario } = renderizarApp('/mes')

      const secao = await screen.findByRole('region', { name: 'Gasto por dia' })
      const erro = await within(secao).findByRole('alert')
      expect(screen.getByText('pão')).toBeInTheDocument()

      falhar = false
      await usuario.click(
        within(erro).getByRole('button', { name: 'Tentar de novo' }),
      )

      expect(await within(secao).findByText(/Média de/)).toBeInTheDocument()
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
        screen.getByText('Nenhum lançamento em novembro de 2026'),
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
