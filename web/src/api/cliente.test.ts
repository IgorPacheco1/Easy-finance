import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API, servidor } from '../testes/servidor.ts'
import {
  definirAoPerderASessao,
  descartarTokenCsrf,
  ErroDaApi,
  requisicao,
} from './cliente.ts'

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

describe('CSRF e sessão vencida (#130)', () => {
  beforeEach(() => descartarTokenCsrf())
  afterEach(() => definirAoPerderASessao(undefined))

  it('manda o token CSRF nos pedidos que mudam dados, e não nos de leitura', async () => {
    const cabecalhos: Record<string, string | null> = {}
    servidor.use(
      http.get(`${API}/exemplo`, ({ request }) => {
        cabecalhos.get = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json({})
      }),
      http.post(`${API}/exemplo`, ({ request }) => {
        cabecalhos.post = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json({})
      }),
    )

    await requisicao('GET', '/exemplo')
    await requisicao('POST', '/exemplo', { corpo: {} })

    expect(cabecalhos).toEqual({ get: null, post: 'token-de-teste' })
  })

  it('busca o token uma vez só e reaproveita', async () => {
    let buscas = 0
    servidor.use(
      http.get(`${API}/auth/csrf`, () => {
        buscas++
        return HttpResponse.json({ token: 't', cabecalho: 'X-XSRF-TOKEN' })
      }),
      http.post(`${API}/exemplo`, () => HttpResponse.json({})),
    )

    await requisicao('POST', '/exemplo', { corpo: {} })
    await requisicao('POST', '/exemplo', { corpo: {} })

    expect(buscas).toBe(1)
  })

  it('num 403 "Sessão desatualizada", busca um token novo e tenta de novo uma vez', async () => {
    const tokens: (string | null)[] = []
    let versao = 0
    servidor.use(
      http.get(`${API}/auth/csrf`, () =>
        HttpResponse.json({ token: `t${++versao}`, cabecalho: 'X-XSRF-TOKEN' }),
      ),
      http.post(`${API}/exemplo`, ({ request }) => {
        const token = request.headers.get('X-XSRF-TOKEN')
        tokens.push(token)
        return token === 't1'
          ? HttpResponse.json(
              {
                title: 'Sessão desatualizada',
                status: 403,
                detail: 'Vencido.',
              },
              {
                status: 403,
                headers: { 'Content-Type': 'application/problem+json' },
              },
            )
          : HttpResponse.json({ ok: true })
      }),
    )

    await expect(
      requisicao('POST', '/exemplo', { corpo: {} }),
    ).resolves.toEqual({
      ok: true,
    })
    expect(tokens).toEqual(['t1', 't2'])
  })

  it('um 401 avisa a sessão, menos nos pedidos de /auth', async () => {
    const aoPerder = vi.fn()
    definirAoPerderASessao(aoPerder)
    const nao = {
      status: 401,
      headers: { 'Content-Type': 'application/problem+json' },
    }
    const corpo = { title: 'Não autenticado', status: 401, detail: 'Entre.' }
    servidor.use(
      http.get(`${API}/exemplo`, () => HttpResponse.json(corpo, nao)),
      http.post(`${API}/auth/entrar`, () => HttpResponse.json(corpo, nao)),
    )

    await expect(
      requisicao('POST', '/auth/entrar', { corpo: {} }),
    ).rejects.toThrow()
    expect(aoPerder).not.toHaveBeenCalled()

    await expect(requisicao('GET', '/exemplo')).rejects.toThrow()
    expect(aoPerder).toHaveBeenCalledOnce()
  })
})
