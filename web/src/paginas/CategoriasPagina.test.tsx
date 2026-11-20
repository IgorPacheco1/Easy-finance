import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NovaCategoria, ResumoDaCategoria } from '../api/tipos.ts'
import {
  MERCADO,
  respostasPadrao,
  resumo,
  SALARIO,
  TRANSPORTE,
} from '../testes/dados.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'

const PROBLEMA = { 'Content-Type': 'application/problem+json' }

async function abrirCategorias() {
  const tela = renderizarApp('/categorias')
  await screen.findByRole('button', { name: 'Despesas' })
  return tela
}

const secao = (titulo: string) => screen.getByRole('region', { name: titulo })

function noResumo(
  categoria: { id: string; nome: string; icone: string; cor: string },
  total: number,
  quantidade: number,
): ResumoDaCategoria {
  return { ...categoria, total, quantidade, percentual: 0 }
}

/** O resumo do mês: Mercado com 3 lançamentos e Salário com 1. Guarda os períodos pedidos. */
function resumoDoMes() {
  const periodos: string[] = []
  servidor.use(
    http.get(`${API}/resumo`, ({ request }) => {
      const p = new URL(request.url).searchParams
      periodos.push(`${p.get('de')}..${p.get('ate')}`)
      return HttpResponse.json(
        resumo({
          despesas: [noResumo(MERCADO, 520, 3)],
          receitas: [noResumo(SALARIO, 3000, 1)],
        }),
      )
    }),
  )
  return periodos
}

describe('tela de categorias', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 5, 10, 0)) // quinta, 05/11/2026
    servidor.use(...respostasPadrao())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('separa com e sem movimento no mês, com o resumo e o link para a Busca (#191)', async () => {
    const periodos = resumoDoMes()
    await abrirCategorias()

    expect(
      await screen.findByText(/gastos em novembro de 2026/),
    ).toHaveTextContent(
      'R$ 520,00 gastos em novembro de 2026 · 1 de 2 categorias com gasto',
    )
    expect(periodos).toEqual(['2026-11-01..2026-11-30'])

    const comGastos = secao('Com gastos no mês')
    const mercado = within(comGastos).getByRole('link', { name: /Mercado/ })
    expect(mercado).toHaveTextContent('Mercado3 lançamentosR$ 520,00')
    expect(mercado).toHaveAttribute(
      'href',
      `/buscar?categoriaId=${MERCADO.id}&de=2026-11-01&ate=2026-11-30`,
    )

    const semMovimento = secao('Sem movimento este mês')
    expect(
      within(semMovimento).getByRole('link', { name: /Transporte/ }),
    ).toHaveTextContent('TransporteCriada por você')
    // Só a categoria criada pela pessoa tem selo e ações.
    expect(within(comGastos).queryByText('Criada por você')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Renomear Mercado' }),
    ).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Renomear Transporte' }),
    ).toBeInTheDocument()
  })

  it('a barra compara cada categoria com a que mais movimentou', async () => {
    servidor.use(
      http.get(`${API}/resumo`, () =>
        HttpResponse.json(
          resumo({
            despesas: [noResumo(MERCADO, 400, 4), noResumo(TRANSPORTE, 100, 1)],
          }),
        ),
      ),
    )
    await abrirCategorias()

    const comGastos = await screen.findByRole('region', {
      name: 'Com gastos no mês',
    })
    const barras = comGastos.querySelectorAll('rect')
    expect([...barras].map((barra) => barra.getAttribute('width'))).toEqual([
      '100%',
      '25%',
    ])
    expect(
      within(comGastos).getByRole('link', { name: /Transporte/ }),
    ).toHaveTextContent('1 lançamento')
    expect(
      screen.queryByRole('region', { name: 'Sem movimento este mês' }),
    ).toBeNull()
  })

  it('a aba Receitas mostra as categorias e o resumo de receitas', async () => {
    resumoDoMes()
    const { usuario } = await abrirCategorias()
    await screen.findByText(/gastos em/)

    await usuario.click(screen.getByRole('button', { name: 'Receitas' }))

    expect(screen.getByRole('button', { name: 'Receitas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText(/recebidos em/)).toHaveTextContent(
      'R$ 3.000,00 recebidos em novembro de 2026 · 1 de 1 categorias com receita',
    )
    expect(
      within(secao('Com receitas no mês')).getByRole('link', {
        name: /Salário/,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Mercado/ })).toBeNull()
  })

  it('se só os valores do mês falham, as categorias continuam e dá para tentar de novo', async () => {
    let falhar = true
    servidor.use(
      http.get(`${API}/resumo`, () =>
        falhar
          ? HttpResponse.error()
          : HttpResponse.json(resumo({ despesas: [noResumo(MERCADO, 52, 1)] })),
      ),
    )
    const { usuario } = await abrirCategorias()

    const erro = await screen.findByRole('alert')
    expect(erro).toHaveTextContent(
      'Não foi possível carregar os valores do mês.',
    )
    const todas = secao('Categorias de despesa')
    expect(
      within(todas).getByRole('link', { name: /Mercado/ }),
    ).toBeInTheDocument()
    expect(
      within(todas).getByRole('link', { name: /Transporte/ }),
    ).toBeInTheDocument()

    falhar = false
    await usuario.click(
      within(erro).getByRole('button', { name: 'Tentar de novo' }),
    )

    expect(
      await screen.findByRole('region', { name: 'Com gastos no mês' }),
    ).toBeInTheDocument()
  })

  it('cria uma categoria de receita e já mostra a aba de receitas', async () => {
    const enviadas: NovaCategoria[] = []
    servidor.use(
      http.post(`${API}/categorias`, async ({ request }) => {
        const corpo = (await request.json()) as NovaCategoria
        enviadas.push(corpo)
        return HttpResponse.json(
          {
            id: 'nova',
            ...corpo,
            sistema: false,
            icone: 'circle-ellipsis',
            cor: 'cinza',
          },
          { status: 201 },
        )
      }),
    )
    const { usuario } = await abrirCategorias()

    await usuario.click(screen.getByRole('button', { name: 'Nova' }))
    const formulario = screen.getByRole('form', { name: 'Nova categoria' })
    await usuario.type(within(formulario).getByLabelText('Nome'), ' Freela ')
    await usuario.click(
      within(formulario).getByRole('button', { name: 'Receita' }),
    )
    await usuario.click(
      within(formulario).getByRole('button', { name: 'Criar categoria' }),
    )

    expect(
      await screen.findByText('Categoria Freela criada.'),
    ).toBeInTheDocument()
    expect(enviadas).toEqual([{ nome: 'Freela', tipo: 'RECEITA' }])
    expect(screen.getByRole('button', { name: 'Receitas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      within(secao('Sem movimento este mês')).getByRole('link', {
        name: /Freela/,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Nova categoria' })).toBeNull()
  })

  it('não envia um nome que já existe (sem diferenciar maiúsculas)', async () => {
    let enviou = false
    servidor.use(
      http.post(`${API}/categorias`, () => {
        enviou = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { usuario } = await abrirCategorias()

    await usuario.click(screen.getByRole('button', { name: 'Nova' }))
    await usuario.type(screen.getByLabelText('Nome'), 'mercado')
    await usuario.click(screen.getByRole('button', { name: 'Criar categoria' }))

    expect(
      screen.getByText('Já existe uma categoria chamada "Mercado".'),
    ).toBeInTheDocument()
    expect(enviou).toBe(false)
  })

  it('renomeia uma categoria personalizada', async () => {
    servidor.use(
      http.put(`${API}/categorias/:id`, async ({ request, params }) => {
        const { nome } = (await request.json()) as { nome: string }
        return HttpResponse.json({ ...TRANSPORTE, id: params.id, nome })
      }),
    )
    const { usuario } = await abrirCategorias()
    await screen.findByRole('region', { name: 'Sem movimento este mês' })

    await usuario.click(
      screen.getByRole('button', { name: 'Renomear Transporte' }),
    )
    const campo = screen.getByLabelText('Novo nome')
    await usuario.clear(campo)
    await usuario.type(campo, 'Uber')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText('Categoria renomeada para Uber.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Uber/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Transporte/ })).toBeNull()
  })

  it('exclui depois de confirmar', async () => {
    servidor.use(
      http.delete(
        `${API}/categorias/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )
    const { usuario } = await abrirCategorias()
    await screen.findByRole('region', { name: 'Sem movimento este mês' })

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir Transporte' }),
    )
    expect(screen.getByText('Excluir Transporte?')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(
      await screen.findByText('Categoria Transporte excluída.'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /Transporte/ })).toBeNull(),
    )
  })

  it('"Cancelar" na confirmação não exclui nada', async () => {
    const { usuario } = await abrirCategorias()
    await screen.findByRole('region', { name: 'Sem movimento este mês' })

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir Transporte' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('link', { name: /Transporte/ })).toBeInTheDocument()
  })

  it('quando a categoria está em uso, mostra a explicação da API e mantém na lista', async () => {
    servidor.use(
      http.delete(`${API}/categorias/:id`, () =>
        HttpResponse.json(
          {
            status: 409,
            title: 'Conflito',
            detail: 'A categoria tem transações e não pode ser excluída.',
          },
          { status: 409, headers: PROBLEMA },
        ),
      ),
    )
    const { usuario } = await abrirCategorias()
    await screen.findByRole('region', { name: 'Sem movimento este mês' })

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir Transporte' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A categoria tem transações e não pode ser excluída.',
    )
    await usuario.click(screen.getByRole('button', { name: 'Entendi' }))
    expect(screen.getByRole('link', { name: /Transporte/ })).toBeInTheDocument()
  })
})
