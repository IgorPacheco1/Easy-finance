import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'
import { MERCADO, transacao } from '../testes/dados.ts'
import { API, servidor } from '../testes/servidor.ts'
import { apagarBancoDosTestes, guardarNaFila, lerFila } from './banco.ts'
import { enviarFila, lancarOuGuardar } from './envio.ts'

function novo(id: string, valor = 10) {
  return { id, valor, data: '2026-11-05', categoriaId: MERCADO.id }
}

function problema(status: number, titulo: string, erros: object[] = []) {
  return HttpResponse.json(
    { title: titulo, status, detail: `Detalhe do ${status}.`, erros },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

/** Responde o POST /transacoes conforme o id, e guarda os ids na ordem em que chegaram. */
function combinarPost(responder: (id: string) => Response) {
  const recebidos: string[] = []
  servidor.use(
    http.post(`${API}/transacoes`, async ({ request }) => {
      const corpo = (await request.json()) as { id: string }
      recebidos.push(corpo.id)
      return responder(corpo.id)
    }),
  )
  return recebidos
}

describe('fila de lançamentos (#100)', () => {
  beforeEach(async () => {
    await apagarBancoDosTestes()
  })

  describe('lancarOuGuardar', () => {
    it('com conexão, envia e não guarda nada', async () => {
      combinarPost(() =>
        HttpResponse.json(transacao({ id: 'a' }), { status: 201 }),
      )

      const resultado = await lancarOuGuardar(novo('a'))

      expect(resultado.situacao).toBe('enviado')
      expect(await lerFila()).toEqual([])
    })

    it('sem conexão, guarda na fila como pendente', async () => {
      combinarPost(() => HttpResponse.error())

      const resultado = await lancarOuGuardar(novo('a', 52.9))

      expect(resultado).toEqual({ situacao: 'guardado' })
      const fila = await lerFila()
      expect(fila).toHaveLength(1)
      expect(fila[0]).toMatchObject({
        id: 'a',
        situacao: 'pendente',
        corpo: novo('a', 52.9),
      })
    })

    it('sem resposta dentro do tempo limite, também guarda', async () => {
      servidor.use(
        http.post(`${API}/transacoes`, async () => {
          await new Promise((resolver) => setTimeout(resolver, 500))
          return HttpResponse.json(transacao(), { status: 201 })
        }),
      )

      const resultado = await lancarOuGuardar(novo('a'), 50)

      expect(resultado).toEqual({ situacao: 'guardado' })
      expect(await lerFila()).toHaveLength(1)
    })

    it('dados recusados não vão para a fila: o erro volta para a tela', async () => {
      combinarPost(() =>
        problema(400, 'Dados inválidos', [
          { campo: 'data', mensagem: 'Data fora do limite.' },
        ]),
      )

      await expect(lancarOuGuardar(novo('a'))).rejects.toMatchObject({
        status: 400,
      })
      expect(await lerFila()).toEqual([])
    })
  })

  describe('enviarFila', () => {
    it('envia na ordem, com o mesmo id, e tira da fila o que foi confirmado (201 e 200)', async () => {
      await guardarNaFila(novo('primeiro'))
      await guardarNaFila(novo('segundo'))
      const recebidos = combinarPost((id) =>
        HttpResponse.json(transacao({ id }), {
          status: id === 'primeiro' ? 201 : 200,
        }),
      )

      const resultado = await enviarFila()

      expect(recebidos).toEqual(['primeiro', 'segundo'])
      expect(resultado).toEqual({ enviados: 2, recusados: 0, pendentes: 0 })
      expect(await lerFila()).toEqual([])
    })

    it('410: marca como excluída em outro aparelho e segue com os próximos', async () => {
      await guardarNaFila(novo('excluido'))
      await guardarNaFila(novo('normal'))
      combinarPost((id) =>
        id === 'excluido'
          ? problema(410, 'Transação excluída')
          : HttpResponse.json(transacao({ id }), { status: 201 }),
      )

      const resultado = await enviarFila()

      expect(resultado).toEqual({ enviados: 1, recusados: 1, pendentes: 0 })
      expect(await lerFila()).toEqual([
        expect.objectContaining({
          id: 'excluido',
          situacao: 'recusado',
          motivo: 'excluida',
        }),
      ])
    })

    it('400: marca como recusado com a mensagem do campo', async () => {
      await guardarNaFila(novo('a'))
      combinarPost(() =>
        problema(400, 'Dados inválidos', [
          {
            campo: 'data',
            mensagem: 'A data deve estar entre 05/11/2025 e 05/11/2027.',
          },
        ]),
      )

      await enviarFila()

      expect(await lerFila()).toEqual([
        expect.objectContaining({
          situacao: 'recusado',
          motivo: 'invalida',
          mensagem: 'A data deve estar entre 05/11/2025 e 05/11/2027.',
        }),
      ])
    })

    it('sem rede no meio: para e deixa o resto pendente para a próxima vez', async () => {
      await guardarNaFila(novo('a'))
      await guardarNaFila(novo('b'))
      await guardarNaFila(novo('c'))
      const recebidos = combinarPost((id) =>
        id === 'a'
          ? HttpResponse.json(transacao({ id }), { status: 201 })
          : HttpResponse.error(),
      )

      const resultado = await enviarFila()

      expect(resultado).toEqual({ enviados: 1, recusados: 0, pendentes: 2 })
      // Não insistiu no "c" depois que o "b" falhou por falta de rede.
      expect(recebidos).toEqual(['a', 'b'])
      expect((await lerFila()).map((l) => [l.id, l.situacao])).toEqual([
        ['b', 'pendente'],
        ['c', 'pendente'],
      ])
    })

    it('erro do servidor (5xx) também espera a próxima vez, sem marcar como recusado', async () => {
      await guardarNaFila(novo('a'))
      combinarPost(() => problema(503, 'Indisponível'))

      const resultado = await enviarFila()

      expect(resultado.pendentes).toBe(1)
      expect((await lerFila())[0].situacao).toBe('pendente')
    })

    it('recusados não são reenviados sozinhos', async () => {
      await guardarNaFila(novo('a'))
      combinarPost(() => problema(410, 'Transação excluída'))
      await enviarFila()

      const recebidos = combinarPost(() =>
        HttpResponse.json(transacao(), { status: 201 }),
      )
      await enviarFila()

      expect(recebidos).toEqual([])
    })

    it('duas chamadas ao mesmo tempo viram um envio só', async () => {
      await guardarNaFila(novo('a'))
      const recebidos = combinarPost((id) =>
        HttpResponse.json(transacao({ id }), { status: 201 }),
      )

      await Promise.all([enviarFila(), enviarFila()])

      expect(recebidos).toEqual(['a'])
    })
  })
})
