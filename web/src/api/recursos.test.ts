import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { API, servidor } from '../testes/servidor.ts'
import {
  criarCategoria,
  excluirCategoria,
  listarCategorias,
} from './categorias.ts'
import { buscarSaldo } from './saldo.ts'
import { criarTransacao, listarTransacoes } from './transacoes.ts'

/**
 * Confere que cada função chama o endereço e o método certos da API, com os dados certos.
 * As respostas imitam o formato real (ver esquema.d.ts).
 */
describe('categorias', () => {
  it('lista filtrando pelo tipo', async () => {
    servidor.use(
      http.get(`${API}/categorias`, ({ request }) => {
        const tipo = new URL(request.url).searchParams.get('tipo')
        return HttpResponse.json([
          { id: '1', nome: 'Salário', tipo, sistema: true },
        ])
      }),
    )

    const categorias = await listarCategorias('RECEITA')

    expect(categorias).toEqual([
      { id: '1', nome: 'Salário', tipo: 'RECEITA', sistema: true },
    ])
  })

  it('cria enviando nome e tipo', async () => {
    servidor.use(
      http.post(`${API}/categorias`, async ({ request }) => {
        const corpo = (await request.json()) as { nome: string; tipo: string }
        return HttpResponse.json(
          { id: '2', ...corpo, sistema: false },
          { status: 201 },
        )
      }),
    )

    await expect(
      criarCategoria({ nome: 'Pets', tipo: 'DESPESA' }),
    ).resolves.toMatchObject({ nome: 'Pets', tipo: 'DESPESA', sistema: false })
  })

  it('exclui pelo id', async () => {
    servidor.use(
      http.delete(
        `${API}/categorias/2`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    await expect(excluirCategoria('2')).resolves.toBeUndefined()
  })
})

describe('transações', () => {
  it('lista o período pedido', async () => {
    servidor.use(
      http.get(`${API}/transacoes`, ({ request }) => {
        const busca = new URL(request.url).searchParams
        expect(busca.get('de')).toBe('2026-11-01')
        expect(busca.get('ate')).toBe('2026-11-30')
        return HttpResponse.json([])
      }),
    )

    await expect(
      listarTransacoes({ de: '2026-11-01', ate: '2026-11-30' }),
    ).resolves.toEqual([])
  })

  it('cria enviando o id gerado no cliente', async () => {
    const id = crypto.randomUUID()
    servidor.use(
      http.post(`${API}/transacoes`, async ({ request }) => {
        const corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            ...corpo,
            descricao: null,
            categoria: { id: 'c1', nome: 'Mercado', tipo: 'DESPESA' },
          },
          { status: 201 },
        )
      }),
    )

    const transacao = await criarTransacao({
      id,
      valor: 52.9,
      data: '2026-11-04',
      categoriaId: 'c1',
    })

    expect(transacao.id).toBe(id)
    expect(transacao.categoria.nome).toBe('Mercado')
  })
})

describe('saldo', () => {
  it('busca o saldo do período', async () => {
    servidor.use(
      http.get(`${API}/saldo`, () =>
        HttpResponse.json({
          de: '2026-11-01',
          ate: '2026-11-30',
          receitas: 3200,
          despesas: 1300,
          saldo: 1900,
        }),
      ),
    )

    await expect(
      buscarSaldo({ de: '2026-11-01', ate: '2026-11-30' }),
    ).resolves.toMatchObject({ saldo: 1900 })
  })
})
