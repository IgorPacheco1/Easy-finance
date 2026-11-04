import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { API, servidor } from '../testes/servidor.ts'
import { ErroDaApi, requisicao } from './cliente.ts'

describe('requisicao', () => {
  it('devolve o corpo da resposta convertido do JSON', async () => {
    servidor.use(
      http.get(`${API}/exemplo`, () => HttpResponse.json({ nome: 'Mercado' })),
    )

    await expect(requisicao('GET', '/exemplo')).resolves.toEqual({
      nome: 'Mercado',
    })
  })

  it('envia o corpo em JSON com o Content-Type certo', async () => {
    servidor.use(
      http.post(`${API}/exemplo`, async ({ request }) =>
        HttpResponse.json({
          tipo: request.headers.get('Content-Type'),
          recebido: await request.json(),
        }),
      ),
    )

    await expect(
      requisicao('POST', '/exemplo', { corpo: { valor: 52.9 } }),
    ).resolves.toEqual({
      tipo: 'application/json',
      recebido: { valor: 52.9 },
    })
  })

  it('monta os parâmetros de consulta e ignora os vazios', async () => {
    servidor.use(
      http.get(`${API}/exemplo`, ({ request }) =>
        HttpResponse.json({ consulta: new URL(request.url).search }),
      ),
    )

    await expect(
      requisicao('GET', '/exemplo', {
        parametros: { de: '2026-11-01', ate: undefined },
      }),
    ).resolves.toEqual({ consulta: '?de=2026-11-01' })
  })

  it('devolve undefined numa resposta 204 sem corpo', async () => {
    servidor.use(
      http.delete(
        `${API}/exemplo`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    await expect(requisicao('DELETE', '/exemplo')).resolves.toBeUndefined()
  })

  it('transforma o ProblemDetail de dados inválidos num ErroDaApi com os erros por campo', async () => {
    servidor.use(
      http.post(`${API}/exemplo`, () =>
        HttpResponse.json(
          {
            title: 'Dados inválidos',
            status: 400,
            detail: 'Um ou mais campos estão inválidos.',
            erros: [
              { campo: 'valor', mensagem: 'O valor deve ser maior que zero.' },
            ],
          },
          {
            status: 400,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    )

    const erro = await requisicao('POST', '/exemplo', { corpo: {} }).catch(
      (e: unknown) => e,
    )

    expect(erro).toBeInstanceOf(ErroDaApi)
    const erroDaApi = erro as ErroDaApi
    expect(erroDaApi.status).toBe(400)
    expect(erroDaApi.titulo).toBe('Dados inválidos')
    expect(erroDaApi.detalhe).toBe('Um ou mais campos estão inválidos.')
    expect(erroDaApi.erroDoCampo('valor')).toBe(
      'O valor deve ser maior que zero.',
    )
    expect(erroDaApi.erroDoCampo('data')).toBeUndefined()
  })

  it('usa a mensagem do ProblemDetail nos erros de negócio (409)', async () => {
    servidor.use(
      http.delete(`${API}/exemplo`, () =>
        HttpResponse.json(
          {
            title: 'Categoria em uso',
            status: 409,
            detail:
              'A categoria tem transações vinculadas e não pode ser excluída.',
          },
          { status: 409 },
        ),
      ),
    )

    await expect(requisicao('DELETE', '/exemplo')).rejects.toMatchObject({
      status: 409,
      titulo: 'Categoria em uso',
      detalhe: 'A categoria tem transações vinculadas e não pode ser excluída.',
      erros: [],
    })
  })

  it('usa uma mensagem padrão quando o erro não vem em JSON', async () => {
    servidor.use(
      http.get(
        `${API}/exemplo`,
        () => new HttpResponse('Bad Gateway', { status: 502 }),
      ),
    )

    await expect(requisicao('GET', '/exemplo')).rejects.toMatchObject({
      status: 502,
      detalhe:
        'O servidor não respondeu como esperado. Tente de novo em instantes.',
    })
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    servidor.use(http.get(`${API}/exemplo`, () => HttpResponse.error()))

    await expect(requisicao('GET', '/exemplo')).rejects.toMatchObject({
      status: 0,
      titulo: 'Sem conexão',
    })
  })
})
