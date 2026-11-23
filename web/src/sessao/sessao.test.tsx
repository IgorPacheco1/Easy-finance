import { screen, waitFor } from '@testing-library/react'
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

const CARREGANDO = { situacao: 'carregando' } as const
const ANONIMO = { situacao: 'anonimo' } as const

describe('sessão no app (#130)', () => {
  /** Quem abre o app sem sessão: o servidor responde 401 e as telas de depois de entrar existem. */
  function semSessao() {
    servidor.use(
      ...respostasPadrao(),
      http.get(`${API}/eu`, () => problema(401, 'Não autenticado', 'Entre.')),
    )
  }

  it('sem sessão (401 ao abrir), leva para a tela de entrar', async () => {
    servidor.use(
      ...respostasPadrao(),
      http.get(`${API}/eu`, () => problema(401, 'Não autenticado', 'Entre.')),
    )

    const { roteador } = renderizarApp('/mes', CARREGANDO)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrar' }),
    ).toBeInTheDocument()
    expect(roteador.state.location.pathname).toBe('/entrar')
  })

  it('com sessão, abre a tela pedida', async () => {
    servidor.use(...respostasPadrao())

    renderizarApp('/mes', CARREGANDO)

    expect(
      await screen.findByRole('button', { name: 'Mês anterior' }),
    ).toBeInTheDocument()
  })

  it('sem conexão ao abrir, usa o último usuário do aparelho', async () => {
    await prepararParaOUsuario(USUARIO)
    servidor.use(
      ...respostasPadrao(),
      http.get(`${API}/eu`, () => HttpResponse.error()),
    )

    renderizarApp('/', CARREGANDO)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lançar' }),
    ).toBeInTheDocument()
  })

  it('sem conexão, quem já está logado continua logado', async () => {
    servidor.use(
      ...respostasPadrao(),
      http.get(`${API}/eu`, () => HttpResponse.error()),
    )

    renderizarApp('/mes')

    expect(
      await screen.findByRole('button', { name: 'Mês anterior' }),
    ).toBeInTheDocument()
    // A conferência ao abrir falhou por falta de conexão: a sessão não cai por isso.
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(screen.queryByRole('heading', { name: 'Entrar' })).toBeNull()
  })

  it('ao abrir com a sessão de outra conta no aparelho, apaga o que ela não enviou e avisa', async () => {
    await prepararParaOUsuario({
      id: 'outra-pessoa',
      email: 'x@email.com',
      nome: null,
      avatar: 'iniciais:cinza',
    })
    await guardarNaFila({
      id: 'a',
      valor: 5,
      data: '2026-11-05',
      categoriaId: 'c',
    })
    servidor.use(...respostasPadrao())

    renderizarApp('/mes', CARREGANDO)

    expect(
      await screen.findByText(
        '1 lançamento não enviado da conta anterior foi descartado.',
      ),
    ).toBeInTheDocument()
    await waitFor(async () => expect(await lerFila()).toEqual([]))
  })

  it('sem conexão e sem ninguém no aparelho, pede para entrar e explica', async () => {
    servidor.use(http.get(`${API}/eu`, () => HttpResponse.error()))

    renderizarApp('/', CARREGANDO)

    expect(
      await screen.findByText(/Sem conexão com o servidor/),
    ).toBeInTheDocument()
  })

  it('uma sessão que vence no meio do uso leva ao login, avisando', async () => {
    servidor.use(
      ...respostasPadrao(),
      http.get(`${API}/eu`, () => problema(401, 'Não autenticado', 'Entre.')),
    )

    // Parte já logado; a conferência que roda ao abrir descobre que a sessão venceu.
    renderizarApp('/mes')

    expect(
      await screen.findByText('Sua sessão expirou. Entre de novo.'),
    ).toBeInTheDocument()
  })

  describe('entrar', () => {
    it('com e-mail e senha corretos, entra e vai para a tela inicial', async () => {
      let recebido: unknown
      semSessao()
      servidor.use(
        http.post(`${API}/auth/entrar`, async ({ request }) => {
          recebido = await request.json()
          return HttpResponse.json(USUARIO)
        }),
      )
      const { usuario, roteador } = renderizarApp('/entrar', ANONIMO)

      await usuario.type(screen.getByLabelText('E-mail'), ' ana@email.com ')
      await usuario.type(screen.getByLabelText('Senha'), 'uma senha longa')
      await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Lançar' }),
      ).toBeInTheDocument()
      expect(recebido).toEqual({
        email: 'ana@email.com',
        senha: 'uma senha longa',
      })
      expect(roteador.state.location.pathname).toBe('/')
    })

    it('confere os campos antes de enviar', async () => {
      semSessao()
      const { usuario } = renderizarApp('/entrar', ANONIMO)

      await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument()
      expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
    })

    it('mostra a mensagem do servidor quando a senha está errada', async () => {
      semSessao()
      servidor.use(
        http.post(`${API}/auth/entrar`, () =>
          problema(401, 'Credenciais inválidas', 'E-mail ou senha inválidos.'),
        ),
      )
      const { usuario } = renderizarApp('/entrar', ANONIMO)

      await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
      await usuario.type(screen.getByLabelText('Senha'), 'errada')
      await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'E-mail ou senha inválidos.',
      )
    })

    it('mostra o tempo de espera quando há tentativas demais (429)', async () => {
      semSessao()
      servidor.use(
        http.post(`${API}/auth/entrar`, () =>
          problema(
            429,
            'Muitas tentativas',
            'Muitas tentativas de login. Tente de novo em 5 minuto(s).',
          ),
        ),
      )
      const { usuario } = renderizarApp('/entrar', ANONIMO)

      await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
      await usuario.type(screen.getByLabelText('Senha'), 'qualquer')
      await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('5 minuto(s)')
    })

    it('entrando com outra conta, apaga o que a anterior não enviou e avisa', async () => {
      await prepararParaOUsuario({
        id: 'outra-pessoa',
        email: 'x@email.com',
        nome: null,
        avatar: 'iniciais:cinza',
      })
      await guardarNaFila({
        id: 'a',
        valor: 5,
        data: '2026-11-05',
        categoriaId: 'c',
      })
      semSessao()
      servidor.use(
        http.post(`${API}/auth/entrar`, () => HttpResponse.json(USUARIO)),
      )
      const { usuario } = renderizarApp('/entrar', ANONIMO)

      await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
      await usuario.type(screen.getByLabelText('Senha'), 'uma senha longa')
      await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(
        await screen.findByText(
          '1 lançamento não enviado da conta anterior foi descartado.',
        ),
      ).toBeInTheDocument()
      await waitFor(async () => expect(await lerFila()).toEqual([]))
    })
  })

  describe('criar conta', () => {
    it('cria a conta e já entra', async () => {
      let recebido: unknown
      semSessao()
      servidor.use(
        http.post(`${API}/auth/cadastro`, async ({ request }) => {
          recebido = await request.json()
          return HttpResponse.json(USUARIO, { status: 201 })
        }),
      )
      const { usuario } = renderizarApp('/criar-conta', ANONIMO)

      await usuario.type(screen.getByLabelText('Seu nome'), ' Ana ')
      await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
      await usuario.type(screen.getByLabelText('Senha'), 'uma senha longa')
      await usuario.type(
        screen.getByLabelText('Repita a senha'),
        'uma senha longa',
      )
      await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Lançar' }),
      ).toBeInTheDocument()
      expect(recebido).toEqual({
        nome: 'Ana',
        email: 'ana@email.com',
        senha: 'uma senha longa',
      })
    })

    it('criando a conta num aparelho de outra conta, apaga o que a anterior não enviou e avisa', async () => {
      // As preferências da outra pessoa também saem (#195).
      localStorage.setItem('guarda:tema', 'escuro')
      await prepararParaOUsuario({
        id: 'outra-pessoa',
        email: 'x@email.com',
        nome: null,
        avatar: 'iniciais:cinza',
      })
      await guardarNaFila({
        id: 'a',
        valor: 5,
        data: '2026-11-05',
        categoriaId: 'c',
      })
      semSessao()
      servidor.use(
        http.post(`${API}/auth/cadastro`, () =>
          HttpResponse.json(USUARIO, { status: 201 }),
        ),
      )
      const { usuario } = renderizarApp('/criar-conta', ANONIMO)

      await usuario.type(screen.getByLabelText('Seu nome'), ' Ana ')
      await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
      await usuario.type(screen.getByLabelText('Senha'), 'uma senha longa')
      await usuario.type(
        screen.getByLabelText('Repita a senha'),
        'uma senha longa',
      )
      await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

      expect(
        await screen.findByText(
          '1 lançamento não enviado da conta anterior foi descartado.',
        ),
      ).toBeInTheDocument()
      await waitFor(async () => expect(await lerFila()).toEqual([]))
      expect(localStorage.getItem('guarda:tema')).toBeNull()
    })

    it('recusa senha curta e senhas diferentes sem falar com o servidor', async () => {
      semSessao()
      const { usuario } = renderizarApp('/criar-conta', ANONIMO)

      await usuario.type(screen.getByLabelText('Seu nome'), ' Ana ')
      await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
      await usuario.type(screen.getByLabelText('Senha'), 'curta')
      await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))
      expect(screen.getByText('Use ao menos 8 caracteres.')).toBeInTheDocument()

      await usuario.clear(screen.getByLabelText('Senha'))
      await usuario.type(screen.getByLabelText('Senha'), 'uma senha longa')
      await usuario.type(screen.getByLabelText('Repita a senha'), 'outra coisa')
      await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))
      expect(screen.getByText('As senhas não são iguais.')).toBeInTheDocument()
    })

    it('pede o nome sem falar com o servidor, e mostra o erro do servidor no campo (#193)', async () => {
      semSessao()
      servidor.use(
        http.post(`${API}/auth/cadastro`, () =>
          HttpResponse.json(
            {
              status: 400,
              title: 'Dados inválidos',
              detail: 'Confira os campos.',
              erros: [{ campo: 'nome', mensagem: 'O nome é obrigatório.' }],
            },
            {
              status: 400,
              headers: { 'Content-Type': 'application/problem+json' },
            },
          ),
        ),
      )
      const { usuario } = renderizarApp('/criar-conta', ANONIMO)

      await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
      await usuario.type(screen.getByLabelText('Senha'), 'uma senha longa')
      await usuario.type(
        screen.getByLabelText('Repita a senha'),
        'uma senha longa',
      )
      await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))
      expect(screen.getByText('Informe seu nome.')).toBeInTheDocument()

      await usuario.type(screen.getByLabelText('Seu nome'), 'a'.repeat(61))
      await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))
      expect(
        screen.getByText('Use no máximo 60 caracteres.'),
      ).toBeInTheDocument()

      await usuario.clear(screen.getByLabelText('Seu nome'))
      await usuario.type(screen.getByLabelText('Seu nome'), 'Ana')
      await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))
      expect(
        await screen.findByText('O nome é obrigatório.'),
      ).toBeInTheDocument()
    })

    it('mostra o erro de e-mail repetido (409)', async () => {
      semSessao()
      servidor.use(
        http.post(`${API}/auth/cadastro`, () =>
          problema(
            409,
            'Conflito',
            'Já existe uma conta com este e-mail. Entre nela ou use outro e-mail.',
          ),
        ),
      )
      const { usuario } = renderizarApp('/criar-conta', ANONIMO)

      await usuario.type(screen.getByLabelText('Seu nome'), ' Ana ')
      await usuario.type(screen.getByLabelText('E-mail'), 'ana@email.com')
      await usuario.type(screen.getByLabelText('Senha'), 'uma senha longa')
      await usuario.type(
        screen.getByLabelText('Repita a senha'),
        'uma senha longa',
      )
      await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Já existe uma conta',
      )
    })
  })
})
