import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { guardarNaFila, lerFila, prepararParaOUsuario } from '../fila/banco.ts'
import { ESTATISTICAS, respostasPadrao, USUARIO } from '../testes/dados.ts'
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
      const { usuario } = renderizarApp('/conta/senha')

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
      const { usuario } = renderizarApp('/conta/senha')

      await usuario.type(screen.getByLabelText('Senha atual'), 'errada errada')
      await usuario.type(screen.getByLabelText('Nova senha'), 'senha nova 4567')
      await usuario.click(screen.getByRole('button', { name: 'Trocar senha' }))

      expect(
        await screen.findByText('Senha atual incorreta.'),
      ).toBeInTheDocument()
    })

    it('confere a nova senha antes de enviar', async () => {
      const { usuario } = renderizarApp('/conta/senha')

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
      screen.queryByRole('link', { name: 'Trocar senha' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar perfil' }),
    ).not.toBeInTheDocument()
    // O perfil continua aparecendo, com o que o aparelho já sabia.
    expect(screen.getByText(USUARIO.email)).toBeInTheDocument()
  })

  describe('perfil (#194)', () => {
    it('mostra o cartão com as iniciais, o nome, o e-mail e desde quando', async () => {
      renderizarApp('/conta')

      const perfil = screen.getByRole('region', { name: 'Seu perfil' })
      expect(perfil).toHaveTextContent('A') // iniciais de "Ana"
      expect(within(perfil).getByText('Ana')).toBeInTheDocument()
      expect(within(perfil).getByText(USUARIO.email)).toBeInTheDocument()
      expect(
        await within(perfil).findByText(
          'Usando o Easy Finance desde novembro de 2026',
        ),
      ).toBeInTheDocument()
    })

    it('mostra os números, pedindo com o fuso do aparelho', async () => {
      const fusos: (string | null)[] = []
      servidor.use(
        http.get(`${API}/eu/estatisticas`, ({ request }) => {
          fusos.push(new URL(request.url).searchParams.get('fuso'))
          return HttpResponse.json({
            desde: '2026-11-01',
            sequenciaDeDias: 1,
            totalDeLancamentos: 1234,
            totalDeCategorias: 7,
          })
        }),
      )
      renderizarApp('/conta')

      const numeros = await screen.findByRole('region', {
        name: 'Seus números',
      })
      await within(numeros).findByText('1.234')
      expect(numeros).toHaveTextContent('dia seguido lançando1')
      expect(numeros).toHaveTextContent('lançamentos1.234')
      expect(numeros).toHaveTextContent('categorias usadas7')
      expect(fusos).toEqual([Intl.DateTimeFormat().resolvedOptions().timeZone])
    })

    it('sem nenhum lançamento, anima a começar a sequência (#196)', async () => {
      servidor.use(
        http.get(`${API}/eu/estatisticas`, () =>
          HttpResponse.json({
            ...ESTATISTICAS,
            sequenciaDeDias: 0,
            totalDeLancamentos: 0,
            totalDeCategorias: 0,
          }),
        ),
      )
      renderizarApp('/conta')

      expect(
        await screen.findByText('Seu primeiro lançamento começa a sequência.'),
      ).toBeInTheDocument()
    })

    it('se os números falham, explica e deixa tentar de novo', async () => {
      let falhar = true
      servidor.use(
        http.get(`${API}/eu/estatisticas`, () =>
          falhar ? HttpResponse.error() : HttpResponse.json(ESTATISTICAS),
        ),
      )
      const { usuario } = renderizarApp('/conta')
      const numeros = screen.getByRole('region', { name: 'Seus números' })

      const erro = await within(numeros).findByRole('alert')
      falhar = false
      await usuario.click(
        within(erro).getByRole('button', { name: 'Tentar de novo' }),
      )

      expect(await within(numeros).findByText('42')).toBeInTheDocument()
    })

    it('"Editar perfil" muda o nome e a cor, e a tela já mostra o novo', async () => {
      const enviados: unknown[] = []
      servidor.use(
        http.patch(`${API}/eu/perfil`, async ({ request }) => {
          const corpo = (await request.json()) as Record<string, string>
          enviados.push(corpo)
          return HttpResponse.json({ ...USUARIO, ...corpo })
        }),
      )
      const { usuario } = renderizarApp('/conta')
      const editar = screen.getByRole('button', { name: 'Editar perfil' })

      await usuario.click(editar)
      const folha = screen.getByRole('dialog', { name: 'Editar perfil' })
      const campo = within(folha).getByLabelText('Nome')
      expect(campo).toHaveValue('Ana')
      await usuario.clear(campo)
      await usuario.type(campo, '  Ana Souza ')
      await usuario.click(within(folha).getByRole('button', { name: 'Verde' }))
      await usuario.click(within(folha).getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
      expect(enviados).toEqual([
        { nome: 'Ana Souza', avatar: 'iniciais:verde' },
      ])
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(editar).toHaveFocus()
      expect(
        screen.getByRole('region', { name: 'Seu perfil' }),
      ).toHaveTextContent('AS')
    })

    it('nome em branco não é enviado', async () => {
      const { usuario } = renderizarApp('/conta')
      await usuario.click(screen.getByRole('button', { name: 'Editar perfil' }))

      await usuario.clear(screen.getByLabelText('Nome'))
      await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(screen.getByText('Informe seu nome.')).toBeInTheDocument()
    })

    it('se o servidor recusa, mostra o motivo e a folha continua aberta', async () => {
      servidor.use(
        http.patch(`${API}/eu/perfil`, () =>
          problema(400, 'Dados inválidos', 'Confira.', [
            {
              campo: 'nome',
              mensagem: 'O nome deve ter de 1 a 60 caracteres.',
            },
          ]),
        ),
      )
      const { usuario } = renderizarApp('/conta')
      await usuario.click(screen.getByRole('button', { name: 'Editar perfil' }))

      await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(
        await screen.findByText('O nome deve ter de 1 a 60 caracteres.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('tocar no avatar troca só a cor', async () => {
      const enviados: unknown[] = []
      servidor.use(
        http.patch(`${API}/eu/perfil`, async ({ request }) => {
          const corpo = (await request.json()) as Record<string, string>
          enviados.push(corpo)
          return HttpResponse.json({ ...USUARIO, ...corpo })
        }),
      )
      const { usuario } = renderizarApp('/conta')

      await usuario.click(
        screen.getByRole('button', { name: 'Trocar a cor do avatar' }),
      )
      const folha = screen.getByRole('dialog', { name: 'Cor do avatar' })
      expect(within(folha).queryByLabelText('Nome')).toBeNull()
      expect(
        within(folha).getByRole('button', { name: 'Cinza' }),
      ).toHaveAttribute('aria-pressed', 'true')
      await usuario.click(within(folha).getByRole('button', { name: 'Roxo' }))
      await usuario.click(within(folha).getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(enviados).toEqual([{ avatar: 'iniciais:roxo' }])
    })

    it('"Cancelar" fecha sem salvar', async () => {
      const { usuario } = renderizarApp('/conta')
      await usuario.click(screen.getByRole('button', { name: 'Editar perfil' }))

      await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('"Trocar senha" abre a tela própria, que volta para a Conta', async () => {
      const { usuario, roteador } = renderizarApp('/conta')

      await usuario.click(screen.getByRole('link', { name: 'Trocar senha' }))

      expect(roteador.state.location.pathname).toBe('/conta/senha')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Trocar senha' }),
      ).toBeInTheDocument()
      await usuario.click(
        screen.getByRole('link', { name: 'Voltar para a Conta' }),
      )
      expect(roteador.state.location.pathname).toBe('/conta')
    })

    it('"Seus dados e privacidade" abre o texto, e a versão aparece em "Sobre"', async () => {
      const { usuario } = renderizarApp('/conta')

      await usuario.click(screen.getByText('Seus dados e privacidade'))

      expect(screen.getByText(/guarda só o que você informa/)).toBeVisible()
      expect(
        screen.getByRole('region', { name: 'Sobre o Easy Finance' }),
      ).toHaveTextContent(`Versão ${__VERSAO_DO_APP__}`)
    })
  })

  describe('preferências do aparelho (#195)', () => {
    it('o tema escolhido vale na hora e fica guardado no aparelho', async () => {
      const { usuario } = renderizarApp('/conta')
      const aparencia = screen.getByRole('group', { name: 'Aparência' })
      expect(
        within(aparencia).getByRole('radio', { name: 'Sistema' }),
      ).toBeChecked()

      await usuario.click(
        within(aparencia).getByRole('radio', { name: 'Escuro' }),
      )

      expect(
        within(aparencia).getByRole('radio', { name: 'Escuro' }),
      ).toBeChecked()
      expect(document.documentElement).toHaveAttribute('data-tema', 'escuro')
      expect(localStorage.getItem('easy-finance:tema')).toBe('escuro')

      await usuario.click(
        within(aparencia).getByRole('radio', { name: 'Claro' }),
      )
      expect(document.documentElement).toHaveAttribute('data-tema', 'claro')
    })

    it('"Esconder valores ao abrir o Mês" é uma chave, e o Mês abre escondido', async () => {
      servidor.use(...respostasPadrao())
      const { usuario } = renderizarApp('/conta')
      const chave = screen.getByRole('switch', {
        name: 'Esconder valores ao abrir o Mês',
      })
      expect(chave).toHaveAttribute('aria-checked', 'false')

      await usuario.click(chave)
      expect(chave).toHaveAttribute('aria-checked', 'true')

      await usuario.click(screen.getByRole('link', { name: 'Mês' }))
      expect(
        await screen.findByRole('button', { name: 'Esconder valores' }),
      ).toHaveAttribute('aria-pressed', 'true')

      await usuario.click(screen.getByRole('link', { name: 'Conta' }))
      await usuario.click(
        screen.getByRole('switch', { name: 'Esconder valores ao abrir o Mês' }),
      )
      expect(localStorage.getItem('easy-finance:esconder-valores')).toBeNull()
    })

    it('funcionam sem conexão (sessão não confirmada)', () => {
      renderizarApp('/conta', {
        situacao: 'logado',
        usuario: USUARIO,
        confirmada: false,
      })

      expect(
        screen.getByRole('region', { name: 'Preferências' }),
      ).toBeInTheDocument()
    })

    it('sair apaga as preferências e volta ao tema do sistema', async () => {
      servidor.use(
        http.post(
          `${API}/auth/sair`,
          () => new HttpResponse(null, { status: 204 }),
        ),
      )
      localStorage.setItem('easy-finance:tema', 'escuro')
      localStorage.setItem('easy-finance:esconder-valores', 'sim')
      const { usuario } = renderizarApp('/conta')

      await usuario.click(screen.getByRole('button', { name: 'Sair' }))

      await screen.findByRole('heading', { level: 1, name: 'Entrar' })
      expect(localStorage.getItem('easy-finance:tema')).toBeNull()
      expect(localStorage.getItem('easy-finance:esconder-valores')).toBeNull()
      expect(document.documentElement).toHaveAttribute('data-tema', 'claro')
    })
  })

  describe('pedir o nome (#194)', () => {
    it('conta sem nome vê "Como podemos te chamar?" e, com o nome salvo, abre o app', async () => {
      const semNome = { ...USUARIO, nome: null }
      const enviados: unknown[] = []
      servidor.use(
        ...respostasPadrao(),
        // Ao abrir, o app confere a sessão no servidor: ele também diz que a conta não tem nome.
        http.get(`${API}/eu`, () => HttpResponse.json(semNome)),
        http.patch(`${API}/eu/perfil`, async ({ request }) => {
          const corpo = (await request.json()) as Record<string, string>
          enviados.push(corpo)
          return HttpResponse.json({ ...semNome, ...corpo })
        }),
      )
      const { usuario } = renderizarApp('/', {
        situacao: 'logado',
        usuario: semNome,
        confirmada: true,
      })

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Como podemos te chamar?',
        }),
      ).toBeInTheDocument()
      await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
      expect(screen.getByText('Informe seu nome.')).toBeInTheDocument()

      await usuario.type(screen.getByLabelText('Seu nome'), ' Ana ')
      await usuario.click(screen.getByRole('button', { name: 'Continuar' }))

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Lançar' }),
      ).toBeInTheDocument()
      expect(enviados).toEqual([{ nome: 'Ana' }])
    })

    it('se o servidor falha, explica e continua na tela', async () => {
      servidor.use(
        http.get(`${API}/eu`, () =>
          HttpResponse.json({ ...USUARIO, nome: null }),
        ),
        http.patch(`${API}/eu/perfil`, () => HttpResponse.error()),
      )
      const { usuario } = renderizarApp('/', {
        situacao: 'logado',
        usuario: { ...USUARIO, nome: null },
        confirmada: true,
      })

      await usuario.type(screen.getByLabelText('Seu nome'), 'Ana')
      await usuario.click(screen.getByRole('button', { name: 'Continuar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Sem conexão com o servidor.',
      )
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Como podemos te chamar?',
        }),
      ).toBeInTheDocument()
    })

    it('sem conexão (sessão não confirmada), não pede o nome e abre o app', async () => {
      servidor.use(...respostasPadrao())
      renderizarApp('/', {
        situacao: 'logado',
        usuario: { ...USUARIO, nome: null },
        confirmada: false,
      })

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Lançar' }),
      ).toBeInTheDocument()
    })
  })
})
