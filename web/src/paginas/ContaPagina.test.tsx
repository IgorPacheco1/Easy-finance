import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { guardarNaFila, lerFila, prepararParaOUsuario } from '../fila/banco.ts'
import { respostasPadrao, USUARIO } from '../testes/dados.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'

function problema(
  status: number,
  titulo: string,
  detalhe: string,
  erros: object[] = [],
) {
  return HttpResponse.json(
    { title: titulo, status, detail: detalhe, erros },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

describe('tela Conta (#130)', () => {
  it('mostra o e-mail de quem está logado e é aberta pela navegação', async () => {
    servidor.use(...respostasPadrao())
    const { usuario } = renderizarApp('/')

    await usuario.click(screen.getByRole('link', { name: 'Conta' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Conta' }),
    ).toBeInTheDocument()
    expect(screen.getByText(USUARIO.email)).toBeInTheDocument()
  })

  describe('sair', () => {
    it('sem nada na fila, sai direto e volta para a tela de entrar', async () => {
      let saiu = false
      servidor.use(
        http.post(`${API}/auth/sair`, () => {
          saiu = true
          return new HttpResponse(null, { status: 204 })
        }),
      )
      const { usuario } = renderizarApp('/conta')

      await usuario.click(screen.getByRole('button', { name: 'Sair' }))

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Entrar' }),
      ).toBeInTheDocument()
      expect(saiu).toBe(true)
      expect(screen.getByText(/Você saiu da conta/)).toBeInTheDocument()
    })

    it('com lançamentos na fila, avisa e deixa cancelar', async () => {
      await prepararParaOUsuario(USUARIO)
      await guardarNaFila({
        id: 'a',
        valor: 5,
        data: '2026-11-05',
        categoriaId: 'c',
      })
      const { usuario } = renderizarApp('/conta')

      await usuario.click(screen.getByRole('button', { name: 'Sair' }))
      // A pergunta só aparece depois de contar a fila no IndexedDB, que é assíncrono.
      expect(
        await screen.findByText(/Há 1 lançamento que ainda não foi enviado/),
      ).toBeInTheDocument()

      await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(
        screen.queryByText(/ainda não foi enviado/),
      ).not.toBeInTheDocument()
      expect(await lerFila()).toHaveLength(1)
    })

    it('com lançamentos na fila, "Sair mesmo" sai e apaga o aparelho', async () => {
      await prepararParaOUsuario(USUARIO)
      await guardarNaFila({
        id: 'a',
        valor: 5,
        data: '2026-11-05',
        categoriaId: 'c',
      })
      servidor.use(
        http.post(
          `${API}/auth/sair`,
          () => new HttpResponse(null, { status: 204 }),
        ),
      )
      const { usuario } = renderizarApp('/conta')

      await usuario.click(screen.getByRole('button', { name: 'Sair' }))
      // A pergunta só aparece depois de contar a fila no IndexedDB, que é assíncrono.
      await usuario.click(
        await screen.findByRole('button', { name: 'Sair mesmo' }),
      )

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Entrar' }),
      ).toBeInTheDocument()
      expect(await lerFila()).toEqual([])
    })

    it('sem conexão, não sai e explica', async () => {
      servidor.use(http.post(`${API}/auth/sair`, () => HttpResponse.error()))
      const { usuario } = renderizarApp('/conta')

      await usuario.click(screen.getByRole('button', { name: 'Sair' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Conta' }),
      ).toBeInTheDocument()
    })
  })

  describe('trocar senha', () => {
    it('troca a senha e avisa', async () => {
      let recebido: unknown
      servidor.use(
        http.put(`${API}/eu/senha`, async ({ request }) => {
          recebido = await request.json()
          return new HttpResponse(null, { status: 204 })
        }),
      )
      const { usuario } = renderizarApp('/conta')

      await usuario.type(
        screen.getByLabelText('Senha atual'),
        'senha antiga 123',
      )
      await usuario.type(screen.getByLabelText('Nova senha'), 'senha nova 4567')
      await usuario.click(screen.getByRole('button', { name: 'Trocar senha' }))

      expect(await screen.findByText(/Senha trocada/)).toBeInTheDocument()
      expect(recebido).toEqual({
        senhaAtual: 'senha antiga 123',
        novaSenha: 'senha nova 4567',
      })
      expect(screen.getByLabelText('Senha atual')).toHaveValue('')
    })

    it('mostra embaixo do campo que o servidor recusou', async () => {
      servidor.use(
        http.put(`${API}/eu/senha`, () =>
          problema(400, 'Dados inválidos', 'Dados inválidos.', [
            { campo: 'senhaAtual', mensagem: 'Senha atual incorreta.' },
          ]),
        ),
      )
      const { usuario } = renderizarApp('/conta')

      await usuario.type(screen.getByLabelText('Senha atual'), 'errada errada')
      await usuario.type(screen.getByLabelText('Nova senha'), 'senha nova 4567')
      await usuario.click(screen.getByRole('button', { name: 'Trocar senha' }))

      expect(
        await screen.findByText('Senha atual incorreta.'),
      ).toBeInTheDocument()
    })

    it('confere a nova senha antes de enviar', async () => {
      const { usuario } = renderizarApp('/conta')

      await usuario.type(
        screen.getByLabelText('Senha atual'),
        'senha antiga 123',
      )
      await usuario.type(screen.getByLabelText('Nova senha'), 'curta')
      await usuario.click(screen.getByRole('button', { name: 'Trocar senha' }))

      expect(screen.getByText('Use ao menos 8 caracteres.')).toBeInTheDocument()
    })
  })

  describe('excluir conta', () => {
    it('pede a senha, avisa que não tem volta e, ao dar certo, apaga o aparelho', async () => {
      await prepararParaOUsuario(USUARIO)
      await guardarNaFila({
        id: 'a',
        valor: 5,
        data: '2026-11-05',
        categoriaId: 'c',
      })
      let recebido: unknown
      servidor.use(
        http.delete(`${API}/eu`, async ({ request }) => {
          recebido = await request.json()
          return new HttpResponse(null, { status: 204 })
        }),
      )
      const { usuario } = renderizarApp('/conta')

      await usuario.click(
        screen.getByRole('button', { name: 'Excluir minha conta' }),
      )
      await usuario.type(
        screen.getByLabelText('Confirme com sua senha'),
        'minha senha 123',
      )
      await usuario.click(
        screen.getByRole('button', { name: 'Excluir para sempre' }),
      )

      expect(
        await screen.findByText('Sua conta foi excluída.'),
      ).toBeInTheDocument()
      expect(recebido).toEqual({ senha: 'minha senha 123' })
      expect(await lerFila()).toEqual([])
    })

    it('com a senha errada, mostra o erro e a conta continua', async () => {
      servidor.use(
        http.delete(`${API}/eu`, () =>
          problema(400, 'Dados inválidos', 'Dados inválidos.', [
            { campo: 'senha', mensagem: 'Senha incorreta.' },
          ]),
        ),
      )
      const { usuario } = renderizarApp('/conta')

      await usuario.click(
        screen.getByRole('button', { name: 'Excluir minha conta' }),
      )
      await usuario.type(
        screen.getByLabelText('Confirme com sua senha'),
        'errada errada',
      )
      await usuario.click(
        screen.getByRole('button', { name: 'Excluir para sempre' }),
      )

      expect(await screen.findByText('Senha incorreta.')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 1, name: 'Conta' }),
      ).toBeInTheDocument()
    })

    it('Cancelar fecha a confirmação sem excluir', async () => {
      const { usuario } = renderizarApp('/conta')

      await usuario.click(
        screen.getByRole('button', { name: 'Excluir minha conta' }),
      )
      await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(
        screen.getByRole('button', { name: 'Excluir minha conta' }),
      ).toBeInTheDocument()
    })
  })

  it('aberta sem conexão (sessão não confirmada), não oferece trocar senha nem excluir', async () => {
    renderizarApp('/conta', {
      situacao: 'logado',
      usuario: USUARIO,
      confirmada: false,
    })

    expect(
      screen.getByText(/Sem conexão: sua sessão será conferida/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Trocar senha' }),
    ).not.toBeInTheDocument()
  })
})
