import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'
import { MERCADO, pagina, respostasPadrao, transacao } from '../testes/dados.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'

/**
 * Responde a busca e guarda cada pedido (os parâmetros, em ordem alfabética, sem a paginação
 * quando ela é a padrão da busca), para conferir o que o app perguntou à API.
 */
function combinarBusca(
  responder: (parametros: URLSearchParams) => Response = () =>
    HttpResponse.json(pagina([])),
) {
  const pedidos: string[] = []
  servidor.use(
    http.get(`${API}/transacoes`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      const resumo = new URLSearchParams(
        [...parametros].filter(
          ([nome, valor]) =>
            !(nome === 'pagina' && valor === '1') &&
            !(nome === 'tamanho' && valor === '20'),
        ),
      )
      resumo.sort()
      pedidos.push(resumo.toString())
      return responder(parametros)
    }),
  )
  return pedidos
}

describe('tela de busca', () => {
  beforeEach(() => {
    servidor.use(...respostasPadrao())
  })

  it('sem nada preenchido, lista tudo na página 1 com 20', async () => {
    const pedidos = combinarBusca(() =>
      HttpResponse.json(pagina([transacao({ descricao: 'pão' })])),
    )
    renderizarApp('/buscar')

    expect(await screen.findByText('pão')).toBeInTheDocument()
    expect(pedidos).toEqual([''])
  })

  it('busca pelo texto só depois da pausa na digitação, e guarda no endereço', async () => {
    const pedidos = combinarBusca((parametros) =>
      HttpResponse.json(
        pagina(
          parametros.get('descricao') === 'uber'
            ? [transacao({ descricao: 'Uber para o trabalho' })]
            : [],
        ),
      ),
    )
    const { usuario, roteador } = renderizarApp('/buscar')
    await screen.findByText('Nenhum lançamento ainda.')

    await usuario.type(
      screen.getByRole('searchbox', { name: 'Buscar na descrição' }),
      'uber',
    )

    expect(await screen.findByText('Uber para o trabalho')).toBeInTheDocument()
    // Um pedido ao abrir e um só depois de digitar: nada de "u", "ub", "ube".
    expect(pedidos).toEqual(['', 'descricao=uber'])
    expect(roteador.state.location.search).toBe('?descricao=uber')
  })

  it('aplica os filtros do painel de uma vez e mostra quantos estão ativos', async () => {
    const pedidos = combinarBusca()
    const { usuario, roteador } = renderizarApp('/buscar')
    await screen.findByText('Nenhum lançamento ainda.')

    await usuario.click(screen.getByRole('button', { name: 'Filtros' }))
    const painel = screen.getByRole('form', { name: 'Filtros' })
    await usuario.selectOptions(
      within(painel).getByLabelText('Tipo'),
      'DESPESA',
    )
    await usuario.selectOptions(
      within(painel).getByLabelText('Categoria'),
      await within(painel).findByRole('option', { name: MERCADO.nome }),
    )
    await usuario.type(within(painel).getByLabelText('Valor mínimo'), '1000')
    expect(within(painel).getByLabelText('Valor mínimo')).toHaveValue(
      'R$ 10,00',
    )
    // Nada é buscado enquanto a pessoa ajusta o painel.
    expect(pedidos).toEqual([''])

    await usuario.click(within(painel).getByRole('button', { name: 'Aplicar' }))

    await screen.findByText('Nenhum lançamento encontrado.')
    expect(pedidos).toEqual([
      '',
      `categoriaId=${MERCADO.id}&tipo=DESPESA&valorMinimo=10`,
    ])
    expect(roteador.state.location.search).toBe(
      `?categoriaId=${MERCADO.id}&tipo=DESPESA&valorMinimo=10.00`,
    )
    expect(screen.queryByRole('form', { name: 'Filtros' })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Filtros (3 ativos)' }),
    ).toBeInTheDocument()
  })

  it('abre já com a busca do endereço', async () => {
    const pedidos = combinarBusca()
    renderizarApp(
      '/buscar?descricao=uber&de=2026-10-01&ate=2026-10-31&valorMaximo=50.00',
    )

    await screen.findByText('Nenhum lançamento encontrado.')
    expect(screen.getByRole('searchbox')).toHaveValue('uber')
    expect(pedidos).toEqual([
      'ate=2026-10-31&de=2026-10-01&descricao=uber&valorMaximo=50',
    ])
  })

  it('com uma só data, avisa e não filtra pelo período', async () => {
    const pedidos = combinarBusca()
    renderizarApp('/buscar?de=2026-10-01')

    expect(
      await screen.findByText(
        'Escolha as duas datas para filtrar por período.',
      ),
    ).toBeInTheDocument()
    expect(pedidos).toEqual([''])
  })

  it('"Limpar busca" volta para a lista completa e esvazia o campo', async () => {
    combinarBusca()
    const { usuario, roteador } = renderizarApp('/buscar?descricao=xyz')
    await screen.findByText('Nenhum lançamento encontrado.')

    await usuario.click(screen.getByRole('button', { name: 'Limpar busca' }))

    expect(roteador.state.location.search).toBe('')
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(
      await screen.findByText('Nenhum lançamento ainda.'),
    ).toBeInTheDocument()
  })

  it('carrega mais resultados no fim da lista e avisa quando acabou', async () => {
    combinarBusca((parametros) => {
      const numero = Number(parametros.get('pagina'))
      return HttpResponse.json(
        numero === 1
          ? pagina([transacao({ id: 'a', descricao: 'pão' })], {
              temMais: true,
            })
          : pagina([transacao({ id: 'b', descricao: 'leite' })], {
              pagina: 2,
            }),
      )
    })
    const { usuario } = renderizarApp('/buscar')
    await screen.findByText('pão')

    await usuario.click(screen.getByRole('button', { name: 'Carregar mais' }))

    expect(await screen.findByText('leite')).toBeInTheDocument()
    expect(screen.getByText('Fim dos resultados.')).toBeInTheDocument()
  })

  it('filtro recusado pela API mostra o motivo do campo', async () => {
    combinarBusca(() =>
      HttpResponse.json(
        {
          title: 'Dados inválidos',
          status: 400,
          detail: 'Um ou mais campos estão inválidos.',
          erros: [
            {
              campo: 'valorMaximo',
              mensagem: 'O valor máximo deve ser igual ou maior que o mínimo.',
            },
          ],
        },
        {
          status: 400,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      ),
    )
    renderizarApp('/buscar?valorMinimo=100&valorMaximo=10')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O valor máximo deve ser igual ou maior que o mínimo.',
    )
  })

  it('a lupa da tela do mês abre a busca', async () => {
    combinarBusca()
    const { usuario, roteador } = renderizarApp('/mes')

    await usuario.click(
      screen.getByRole('link', { name: 'Buscar lançamentos' }),
    )

    expect(roteador.state.location.pathname).toBe('/buscar')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Buscar' }),
    ).toBeInTheDocument()
  })
})
