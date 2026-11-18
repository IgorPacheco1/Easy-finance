import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransacaoEditada } from '../api/tipos.ts'
import { MERCADO, pagina, respostasPadrao, transacao } from '../testes/dados.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'
import { MENSAGEM_SEM_CONEXAO } from './EditarLancamentoPagina.tsx'

const ID = '00000000-0000-4000-8000-0000000000aa'
const FEIRA = transacao({ id: ID, data: '2026-11-03', descricao: 'feira' })

/** Uma resposta de erro no formato da API (ProblemDetail). */
function problema(status: number, dados: Record<string, unknown> = {}) {
  return HttpResponse.json(
    { status, title: 'Erro', detail: 'Algo falhou no servidor.', ...dados },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

/** A API devolve a transação FEIRA e guarda o corpo de cada PUT e cada DELETE recebido. */
function servidorComFeira(
  respostas: { put?: () => Response; del?: () => Response } = {},
) {
  const edicoes: TransacaoEditada[] = []
  const exclusoes: string[] = []
  servidor.use(
    http.get(`${API}/transacoes/:id`, () => HttpResponse.json(FEIRA)),
    http.put(`${API}/transacoes/:id`, async ({ request, params }) => {
      const corpo = (await request.json()) as TransacaoEditada
      edicoes.push(corpo)
      return (
        respostas.put?.() ??
        HttpResponse.json(
          transacao({ ...FEIRA, id: String(params.id), valor: corpo.valor }),
        )
      )
    }),
    http.delete(`${API}/transacoes/:id`, ({ params }) => {
      exclusoes.push(String(params.id))
      return respostas.del?.() ?? new HttpResponse(null, { status: 204 })
    }),
  )
  return { edicoes, exclusoes }
}

async function abrirEdicao() {
  const tela = renderizarApp(`/lancamentos/${ID}`)
  // Espera o lançamento e as categorias chegarem antes de começar.
  await screen.findByRole('button', { name: 'Mercado', pressed: true })
  return tela
}

const campoValor = () => screen.getByLabelText('Valor')

describe('tela de editar lançamento (#101)', () => {
  beforeEach(() => {
    // "Hoje" fixo: quinta, 05/11/2026 (só o relógio é falso, para o user-event funcionar).
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 5, 10, 0))
    servidor.use(...respostasPadrao())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('abre já preenchida com os dados do lançamento', async () => {
    servidorComFeira()
    await abrirEdicao()

    expect(campoValor()).toHaveValue('12,90')
    expect(
      screen.getByRole('button', { name: 'Despesa', pressed: true }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue('feira')
  })

  it('salva as alterações e volta para o mês do lançamento com um aviso', async () => {
    const { edicoes } = servidorComFeira()
    const { usuario, roteador } = await abrirEdicao()

    await usuario.clear(campoValor())
    await usuario.type(campoValor(), '2500')
    await usuario.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    )

    expect(await screen.findByText('Lançamento salvo.')).toBeInTheDocument()
    expect(edicoes).toEqual([
      {
        valor: 25,
        data: '2026-11-03',
        descricao: 'feira',
        categoriaId: MERCADO.id,
      },
    ])
    expect(roteador.state.location.pathname).toBe('/mes')
    expect(roteador.state.location.search).toBe('?m=2026-11')
  })

  it('abre pelo item da lista do mês e volta para o mesmo mês depois de salvar', async () => {
    servidorComFeira()
    servidor.use(
      http.get(`${API}/transacoes`, () => HttpResponse.json(pagina([FEIRA]))),
    )
    const { usuario, roteador } = renderizarApp('/mes?m=2026-10')

    await usuario.click(await screen.findByRole('link', { name: /feira/ }))
    await screen.findByRole('button', { name: 'Mercado', pressed: true })
    await usuario.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    )

    await screen.findByText('Lançamento salvo.')
    expect(roteador.state.location.search).toBe('?m=2026-10')
  })

  it('confere os campos antes de enviar: trocar o tipo pede outra categoria', async () => {
    const { edicoes } = servidorComFeira()
    const { usuario } = await abrirEdicao()

    await usuario.click(screen.getByRole('button', { name: 'Receita' }))
    await usuario.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    )

    expect(
      await screen.findByText('A categoria é obrigatória.'),
    ).toBeInTheDocument()
    expect(edicoes).toEqual([])
  })

  it('mostra embaixo do campo o erro que a API devolveu para ele', async () => {
    servidorComFeira({
      put: () =>
        problema(400, {
          erros: [{ campo: 'valor', mensagem: 'Valor alto demais.' }],
        }),
    })
    const { usuario } = await abrirEdicao()

    await usuario.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    )

    expect(await screen.findByText('Valor alto demais.')).toBeInTheDocument()
    // Continua na tela, com o botão de novo disponível.
    expect(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    ).toBeEnabled()
  })

  it('mostra a mensagem da API quando ela recusa sem apontar um campo', async () => {
    servidorComFeira({ put: () => problema(500) })
    const { usuario } = await abrirEdicao()

    await usuario.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Algo falhou no servidor.',
    )
  })

  it('sem conexão ao salvar, explica que editar precisa de internet', async () => {
    servidorComFeira({ put: () => HttpResponse.error() })
    const { usuario } = await abrirEdicao()

    await usuario.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      MENSAGEM_SEM_CONEXAO,
    )
  })

  it('exclui só depois de confirmar e volta com um aviso', async () => {
    const { exclusoes } = servidorComFeira()
    const { usuario, roteador } = await abrirEdicao()

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir lançamento' }),
    )
    const secao = screen.getByRole('region', { name: 'Excluir lançamento' })
    expect(
      within(secao).getByText('Excluir este lançamento? Não dá para desfazer.'),
    ).toBeInTheDocument()
    // O foco fica no "Cancelar": um Enter sem querer não apaga nada.
    expect(
      within(secao).getByRole('button', { name: 'Cancelar' }),
    ).toHaveFocus()
    expect(exclusoes).toEqual([])

    await usuario.click(within(secao).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText('Lançamento excluído.')).toBeInTheDocument()
    expect(exclusoes).toEqual([ID])
    expect(roteador.state.location.pathname).toBe('/mes')
  })

  it('cancelar a exclusão não apaga nada', async () => {
    const { exclusoes } = servidorComFeira()
    const { usuario } = await abrirEdicao()

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir lançamento' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.getByRole('button', { name: 'Excluir lançamento' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Excluir este lançamento? Não dá para desfazer.'),
    ).not.toBeInTheDocument()
    expect(exclusoes).toEqual([])
  })

  it('sem conexão ao excluir, explica e fecha a confirmação', async () => {
    servidorComFeira({ del: () => HttpResponse.error() })
    const { usuario } = await abrirEdicao()

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir lançamento' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      MENSAGEM_SEM_CONEXAO,
    )
    expect(
      screen.getByRole('button', { name: 'Excluir lançamento' }),
    ).toBeEnabled()
  })

  it('lançamento que já foi excluído em outro aparelho mostra "não encontrado"', async () => {
    servidorComFeira({ del: () => problema(404) })
    const { usuario } = await abrirEdicao()

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir lançamento' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(
      await screen.findByText(/Lançamento não encontrado/),
    ).toBeInTheDocument()
  })

  it('lançamento inexistente ou de outra pessoa (404) mostra "não encontrado"', async () => {
    servidor.use(http.get(`${API}/transacoes/:id`, () => problema(404)))
    renderizarApp(`/lancamentos/${ID}`)

    expect(
      await screen.findByText(/Lançamento não encontrado/),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Valor')).not.toBeInTheDocument()
  })

  it('sem conexão ao abrir, explica e deixa tentar de novo', async () => {
    let falhar = true
    servidorComFeira()
    servidor.use(
      http.get(`${API}/transacoes/:id`, () =>
        falhar ? HttpResponse.error() : HttpResponse.json(FEIRA),
      ),
    )
    const { usuario } = renderizarApp(`/lancamentos/${ID}`)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      MENSAGEM_SEM_CONEXAO,
    )
    falhar = false
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByLabelText('Valor')).toHaveValue('12,90')
  })

  it('mostra a mensagem da API quando falha ao abrir por outro motivo', async () => {
    servidor.use(http.get(`${API}/transacoes/:id`, () => problema(500)))
    renderizarApp(`/lancamentos/${ID}`)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Algo falhou no servidor.',
    )
  })
})
