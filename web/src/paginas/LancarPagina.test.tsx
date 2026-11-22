import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Categoria, NovaTransacao } from '../api/tipos.ts'
import { guardarNaFila, lerCategorias, lerFila } from '../fila/banco.ts'
import {
  CATEGORIAS,
  MERCADO,
  respostasPadrao,
  SALARIO,
  transacao,
  TRANSPORTE,
} from '../testes/dados.ts'
import { semRepetidos } from '../testes/pedidos.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'

type Usuario = ReturnType<typeof renderizarApp>['usuario']

/**
 * Guarda o corpo de cada POST /transacoes, para conferir o que o app enviou. `resposta` permite
 * responder outra coisa (um erro, por exemplo); se ela devolver `undefined`, a API "aceita".
 */
function gravarEnvios(resposta?: () => Response | undefined) {
  const envios: NovaTransacao[] = []
  servidor.use(
    http.post(`${API}/transacoes`, async ({ request }) => {
      const corpo = (await request.json()) as NovaTransacao
      envios.push(corpo)
      return (
        resposta?.() ??
        HttpResponse.json(
          transacao({ id: corpo.id, valor: corpo.valor, data: corpo.data }),
          { status: 201 },
        )
      )
    }),
  )
  return envios
}

/** O saldo que a API devolve depois do lançamento. Guarda os períodos pedidos. */
function saldoDepois(saldo: number) {
  const periodos: string[] = []
  servidor.use(
    http.get(`${API}/saldo`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      periodos.push(`${parametros.get('de')}..${parametros.get('ate')}`)
      return HttpResponse.json({
        de: parametros.get('de'),
        ate: parametros.get('ate'),
        receitas: 0,
        despesas: 0,
        saldo,
      })
    }),
  )
  return periodos
}

async function abrirLancar() {
  const tela = renderizarApp('/')
  // Espera as categorias carregarem antes de começar.
  await screen.findByRole('button', { name: 'Mercado' })
  return tela
}

const visor = () => screen.getByRole('textbox', { name: 'Valor' })

/** Digita no campo do valor, como no teclado do celular ("1290" = 1, 2, 9, 0). */
async function teclar(usuario: Usuario, teclas: string) {
  await usuario.type(visor(), teclas)
}

/** Valor, Mercado e "Lançar despesa": o caminho mais comum. */
async function lancarDespesa(usuario: Usuario, teclas = '1290') {
  await teclar(usuario, teclas)
  await usuario.click(screen.getByRole('button', { name: 'Mercado' }))
  await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))
}

describe('tela de lançamento', () => {
  beforeEach(() => {
    // "Hoje" fixo: quinta, 05/11/2026. Só o relógio é falso; os outros temporizadores seguem
    // normais, para o user-event funcionar.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 5, 10, 0))
    servidor.use(...respostasPadrao())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('começa em Despesa, Hoje e R$ 0,00, mostrando só as categorias de despesa', async () => {
    await abrirLancar()

    expect(screen.getByRole('button', { name: 'Despesa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Data: Hoje' })).toBeVisible()
    expect(visor()).toHaveValue('R$ 0,00')
    expect(screen.queryByRole('button', { name: 'Salário' })).toBeNull()
  })

  it('ao trocar para Receita, mostra as categorias de receita e limpa a escolhida', async () => {
    const { usuario } = await abrirLancar()
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))

    await usuario.click(screen.getByRole('button', { name: 'Receita' }))

    expect(screen.getByRole('button', { name: 'Salário' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.queryByRole('button', { name: 'Mercado' })).toBeNull()
  })

  it('abre com o foco no valor e, enquanto ele está vazio, a dica de tocar para digitar (#216)', async () => {
    const { usuario } = await abrirLancar()

    expect(visor()).toHaveFocus()
    expect(visor()).toHaveAttribute('inputmode', 'numeric')
    expect(visor()).toHaveAccessibleDescription('Toque no valor para digitar')

    await teclar(usuario, '5')
    expect(screen.queryByText('Toque no valor para digitar')).toBeNull()
  })

  it('o valor é digitado no campo como caixa registradora, e apaga do fim (#216)', async () => {
    const { usuario } = await abrirLancar()

    await teclar(usuario, '1290')
    expect(visor()).toHaveValue('R$ 12,90')

    await usuario.type(visor(), '00')
    expect(visor()).toHaveValue('R$ 1.290,00')

    await usuario.type(visor(), '{Backspace}')
    expect(visor()).toHaveValue('R$ 129,00')
  })

  it('a tecla de confirmar do teclado, no campo do valor, lança (#216)', async () => {
    const envios = gravarEnvios()
    const { usuario } = await abrirLancar()
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))

    await usuario.type(visor(), '1290{Enter}')

    expect(
      await screen.findByRole('heading', { name: 'Despesa lançada' }),
    ).toBeInTheDocument()
    expect(envios).toHaveLength(1)
  })

  it('o botão diz o que falta: valor, depois categoria, depois lançar (#187)', async () => {
    const { usuario } = await abrirLancar()
    expect(
      screen.getByRole('button', { name: 'Digite o valor' }),
    ).toBeInTheDocument()

    await teclar(usuario, '5')
    expect(
      screen.getByRole('button', { name: 'Escolha a categoria' }),
    ).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))
    expect(
      screen.getByRole('button', { name: 'Lançar despesa' }),
    ).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Receita' }))
    await usuario.click(screen.getByRole('button', { name: 'Salário' }))
    expect(
      screen.getByRole('button', { name: 'Lançar receita' }),
    ).toBeInTheDocument()
  })

  it('fora do campo, o teclado físico ainda digita e apaga, mas não na descrição nem com Ctrl (#187)', async () => {
    const { usuario } = await abrirLancar()
    await usuario.keyboard('129')
    expect(visor()).toHaveValue('R$ 1,29')

    // Clicar na categoria tira o foco do campo; os números continuam indo para o valor.
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))
    await usuario.keyboard('0')
    expect(visor()).toHaveValue('R$ 12,90')
    await usuario.keyboard('{Backspace}')
    expect(visor()).toHaveValue('R$ 1,29')

    await usuario.keyboard('{Control>}5{/Control}')
    expect(visor()).toHaveValue('R$ 1,29')

    await usuario.click(screen.getByRole('button', { name: 'Descrição' }))
    const campo = screen.getByLabelText('Descrição (opcional)')
    await waitFor(() => expect(campo).toHaveFocus())
    await usuario.keyboard('pão 2')
    expect(campo).toHaveValue('pão 2')
    expect(visor()).toHaveValue('R$ 1,29')
  })

  it('Enter do teclado físico lança a partir das categorias, mas não em outros botões (#187)', async () => {
    const envios = gravarEnvios()
    const { usuario } = await abrirLancar()
    await usuario.keyboard('500')

    // Enter em "Receita" faz o normal do botão: troca o tipo, sem lançar.
    await usuario.click(screen.getByRole('button', { name: 'Receita' }))
    await usuario.keyboard('{Enter}')
    expect(envios).toHaveLength(0)

    await usuario.click(screen.getByRole('button', { name: 'Despesa' }))
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))
    await usuario.keyboard('{Enter}')

    expect(
      await screen.findByRole('heading', { name: 'Despesa lançada' }),
    ).toBeInTheDocument()
    expect(envios).toHaveLength(1)
  })

  it('sem valor e sem categoria, mostra os erros e não envia nada', async () => {
    const envios = gravarEnvios()
    const { usuario } = await abrirLancar()

    // Enter no campo do valor (onde a tela abre) também tenta lançar.
    await usuario.keyboard('{Enter}')

    expect(visor()).toHaveAccessibleDescription(
      'O valor deve ser maior que zero.',
    )
    expect(screen.getByText('A categoria é obrigatória.')).toBeInTheDocument()
    expect(envios).toHaveLength(0)
  })

  it('lança, mostra a confirmação com o saldo antes e depois, e "Lançar outra" volta limpo', async () => {
    const vibrar = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrar,
      configurable: true,
    })
    const envios = gravarEnvios()
    const periodos = saldoDepois(87.1)
    const { usuario } = await abrirLancar()

    await teclar(usuario, '1290')
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))
    await usuario.click(screen.getByRole('button', { name: 'Descrição' }))
    await usuario.type(
      screen.getByLabelText('Descrição (opcional)'),
      '  feira  ',
    )
    expect(
      screen.getByRole('button', { name: 'Descrição: feira' }),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))

    const titulo = await screen.findByRole('heading', {
      name: 'Despesa lançada',
    })
    await waitFor(() => expect(titulo).toHaveFocus())
    expect(screen.getByText('R$ 12,90 em Mercado, hoje')).toBeInTheDocument()
    expect(envios).toEqual([
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        valor: 12.9,
        data: '2026-11-05',
        descricao: 'feira', // sem os espaços das pontas
        categoriaId: MERCADO.id,
      },
    ])
    // Saldo depois: 87,10. Antes da despesa de 12,90: 100,00.
    const saldo = await screen.findByRole('definition')
    expect(saldo).toHaveTextContent('R$ 100,00')
    expect(saldo).toHaveTextContent('R$ 87,10')
    expect(screen.getByText('Saldo de novembro de 2026')).toBeInTheDocument()
    expect(semRepetidos(periodos)).toEqual(['2026-11-01..2026-11-30'])
    expect(vibrar).toHaveBeenCalledWith(30)
    Reflect.deleteProperty(navigator, 'vibrate')

    await usuario.click(screen.getByRole('button', { name: 'Lançar outra' }))

    // Pronto para o próximo: valor, categoria e descrição limpos; foco no valor.
    await waitFor(() => expect(visor()).toHaveFocus())
    expect(visor()).toHaveValue('R$ 0,00')
    expect(screen.getByRole('button', { name: 'Mercado' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Descrição' })).toBeVisible()
  })

  it('na receita, o saldo de antes é o de agora menos o valor', async () => {
    gravarEnvios()
    saldoDepois(3000)
    const { usuario } = await abrirLancar()
    await usuario.click(screen.getByRole('button', { name: 'Receita' }))

    await teclar(usuario, '300000')
    await usuario.click(screen.getByRole('button', { name: 'Salário' }))
    await usuario.click(screen.getByRole('button', { name: 'Lançar receita' }))

    expect(
      await screen.findByRole('heading', { name: 'Receita lançada' }),
    ).toBeInTheDocument()
    const saldo = await screen.findByRole('definition')
    expect(saldo).toHaveTextContent('R$ 0,00')
    expect(saldo).toHaveTextContent('R$ 3.000,00')
  })

  it('lança com a data de Ontem', async () => {
    const envios = gravarEnvios()
    const { usuario } = await abrirLancar()

    await teclar(usuario, '500')
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))
    await usuario.click(screen.getByRole('button', { name: 'Data: Hoje' }))
    await usuario.click(screen.getByRole('button', { name: 'Ontem' }))
    expect(
      screen.getByRole('button', { name: 'Data: Ontem' }),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))

    expect(
      await screen.findByText('R$ 5,00 em Mercado, ontem'),
    ).toBeInTheDocument()
    expect(envios[0].data).toBe('2026-11-04')
  })

  it('"Outra data" abre o calendário, e a data escolhida aparece no chip e na confirmação', async () => {
    gravarEnvios()
    const periodos = saldoDepois(0)
    const { usuario } = await abrirLancar()

    await usuario.click(screen.getByRole('button', { name: 'Data: Hoje' }))
    await usuario.click(screen.getByRole('button', { name: 'Outra data' }))
    const calendario = screen.getByLabelText('Escolha a data')
    await waitFor(() => expect(calendario).toHaveValue('2026-11-05'))
    fireEvent.change(calendario, { target: { value: '2026-10-20' } })
    expect(
      screen.getByRole('button', { name: 'Data: 20/10/2026' }),
    ).toBeInTheDocument()

    await lancarDespesa(usuario, '500')

    expect(
      await screen.findByText('R$ 5,00 em Mercado, 20/10/2026'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(semRepetidos(periodos)).toEqual(['2026-10-01..2026-10-31']),
    )
  })

  it('"Desfazer" exclui o lançamento que acabou de ser feito', async () => {
    gravarEnvios()
    const excluidos: string[] = []
    servidor.use(
      http.delete(`${API}/transacoes/:id`, ({ params }) => {
        excluidos.push(String(params.id))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { usuario } = await abrirLancar()
    await lancarDespesa(usuario)
    await screen.findByRole('heading', { name: 'Despesa lançada' })

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))

    expect(await screen.findByText('Lançamento desfeito.')).toBeInTheDocument()
    expect(excluidos).toHaveLength(1)
    expect(visor()).toHaveValue('R$ 0,00')
  })

  it('se "Desfazer" falha, avisa e a confirmação continua na tela', async () => {
    gravarEnvios()
    servidor.use(
      http.delete(`${API}/transacoes/:id`, () => HttpResponse.error()),
    )
    const { usuario } = await abrirLancar()
    await lancarDespesa(usuario)
    await screen.findByRole('heading', { name: 'Despesa lançada' })

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))

    expect(
      await screen.findByText(/Não foi possível falar com o servidor/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Despesa lançada' }),
    ).toBeInTheDocument()
  })

  it('sem conexão, guarda no aparelho e envia depois com o MESMO id (#100)', async () => {
    let falhar = true
    const envios = gravarEnvios(() =>
      falhar ? HttpResponse.error() : undefined,
    )
    const { usuario } = await abrirLancar()

    await lancarDespesa(usuario)

    expect(
      await screen.findByRole('heading', { name: 'Guardado no aparelho' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Sem conexão. Será enviado quando a internet voltar.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('1 lançamento aguardando envio.'),
    ).toBeInTheDocument()

    // O formulário volta pronto para o próximo, como num lançamento normal.
    await usuario.click(screen.getByRole('button', { name: 'Lançar outra' }))
    expect(visor()).toHaveValue('R$ 0,00')

    falhar = false
    await usuario.click(screen.getByRole('button', { name: 'Enviar agora' }))

    await waitFor(() =>
      expect(screen.queryByText('1 lançamento aguardando envio.')).toBeNull(),
    )
    expect(envios).toHaveLength(2)
    expect(envios[1].id).toBe(envios[0].id)
  })

  it('sem conexão, "Desfazer" tira o lançamento da fila do aparelho (#187)', async () => {
    gravarEnvios(() => HttpResponse.error())
    const { usuario } = await abrirLancar()
    await lancarDespesa(usuario)
    await screen.findByText('1 lançamento aguardando envio.')

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))

    expect(await screen.findByText('Lançamento desfeito.')).toBeInTheDocument()
    expect(await lerFila()).toEqual([])
    expect(screen.queryByText(/aguardando envio/)).toBeNull()
  })

  it('se a fila já foi enviada antes do "Desfazer", exclui no servidor', async () => {
    let falhar = true
    gravarEnvios(() => (falhar ? HttpResponse.error() : undefined))
    const excluidos: string[] = []
    servidor.use(
      http.delete(`${API}/transacoes/:id`, ({ params }) => {
        excluidos.push(String(params.id))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { usuario } = await abrirLancar()
    await lancarDespesa(usuario)
    await screen.findByText('1 lançamento aguardando envio.')

    // A internet voltou e a fila foi enviada com a confirmação ainda na tela.
    falhar = false
    await usuario.click(screen.getByRole('button', { name: 'Enviar agora' }))
    await waitFor(() =>
      expect(screen.queryByText(/aguardando envio/)).toBeNull(),
    )
    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))

    expect(await screen.findByText('Lançamento desfeito.')).toBeInTheDocument()
    expect(excluidos).toHaveLength(1)
  })

  it('ao abrir com lançamentos guardados e com conexão, envia sozinho', async () => {
    await guardarNaFila({
      id: 'guardado',
      valor: 10,
      data: '2026-11-04',
      categoriaId: MERCADO.id,
    })
    const envios = gravarEnvios()

    await abrirLancar()

    await waitFor(() => expect(envios.map((e) => e.id)).toEqual(['guardado']))
    expect(screen.queryByText(/aguardando envio/)).toBeNull()
  })

  it('lançamento excluído em outro aparelho (410): pergunta, e "Lançar de novo" usa um id novo', async () => {
    await guardarNaFila({
      id: 'antigo',
      valor: 52.9,
      data: '2026-11-04',
      descricao: 'feira',
      categoriaId: MERCADO.id,
    })
    const envios = gravarEnvios(() =>
      envios.length === 1
        ? HttpResponse.json(
            { status: 410, title: 'Transação excluída', detail: 'Excluída.' },
            {
              status: 410,
              headers: { 'Content-Type': 'application/problem+json' },
            },
          )
        : undefined,
    )
    const { usuario } = await abrirLancar()

    const recusado = await screen.findByRole('alert')
    expect(recusado).toHaveTextContent(
      'O lançamento de R$ 52,90 de 04/11/2026 (feira) não foi enviado: ele já tinha sido excluído em outro aparelho.',
    )

    await usuario.click(
      within(recusado).getByRole('button', { name: 'Lançar de novo' }),
    )

    await waitFor(() => expect(envios).toHaveLength(2))
    expect(envios[1].id).not.toBe('antigo')
    expect(envios[1]).toMatchObject({ valor: 52.9, descricao: 'feira' })
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('"Descartar" tira o lançamento recusado do aparelho sem enviar', async () => {
    await guardarNaFila({
      id: 'antigo',
      valor: 10,
      data: '2026-11-04',
      categoriaId: MERCADO.id,
    })
    const envios = gravarEnvios(() =>
      HttpResponse.json(
        { status: 410, title: 'Transação excluída', detail: 'Excluída.' },
        {
          status: 410,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      ),
    )
    const { usuario } = await abrirLancar()
    const recusado = await screen.findByRole('alert')

    await usuario.click(
      within(recusado).getByRole('button', { name: 'Descartar' }),
    )

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(await lerFila()).toEqual([])
    expect(envios).toHaveLength(1)
  })

  it('sem conexão, usa as categorias guardadas da última vez (#100)', async () => {
    await abrirLancar() // com conexão: guarda as categorias no aparelho
    await waitFor(async () => expect(await lerCategorias()).toHaveLength(3))
    cleanup()
    servidor.use(http.get(`${API}/categorias`, () => HttpResponse.error()))

    renderizarApp('/')

    expect(
      await screen.findByRole('button', { name: 'Mercado' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('se a API responde 409 (mesmo id com outros dados), troca o id e explica', async () => {
    let primeira = true
    const envios = gravarEnvios(() => {
      if (!primeira) return undefined
      primeira = false
      return HttpResponse.json(
        { status: 409, title: 'Conflito', detail: 'Id já usado.' },
        {
          status: 409,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      )
    })
    const { usuario } = await abrirLancar()

    await lancarDespesa(usuario)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Um lançamento anterior com outros dados já foi registrado.',
    )
    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))

    await screen.findByRole('heading', { name: 'Despesa lançada' })
    expect(envios[1].id).not.toBe(envios[0].id)
  })

  it('mostra embaixo de cada campo o erro que a API devolveu, abrindo a data e a descrição', async () => {
    gravarEnvios(() =>
      HttpResponse.json(
        {
          status: 400,
          title: 'Dados inválidos',
          detail: 'Confira os campos.',
          erros: [
            { campo: 'valor', mensagem: 'Valor alto demais.' },
            { campo: 'data', mensagem: 'Data fora do limite.' },
            { campo: 'descricao', mensagem: 'Descrição recusada.' },
          ],
        },
        {
          status: 400,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      ),
    )
    const { usuario } = await abrirLancar()

    await lancarDespesa(usuario)

    await waitFor(() =>
      expect(visor()).toHaveAccessibleDescription('Valor alto demais.'),
    )
    expect(screen.getByText('Data fora do limite.')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição (opcional)')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByText('Descrição recusada.')).toBeInTheDocument()
  })

  it('se as categorias não carregam, mostra o erro e deixa tentar de novo', async () => {
    let falhar = true
    servidor.use(
      http.get(`${API}/categorias`, () =>
        falhar ? HttpResponse.error() : HttpResponse.json(CATEGORIAS),
      ),
    )
    const { usuario } = renderizarApp('/')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível falar com o servidor.',
    )

    falhar = false
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('button', { name: 'Mercado' })).toBeVisible()
  })

  it('pede as categorias mais usadas primeiro e mostra na ordem da API (#97)', async () => {
    const pedidos: (string | null)[] = []
    servidor.use(
      http.get(`${API}/categorias`, ({ request }) => {
        pedidos.push(new URL(request.url).searchParams.get('ordem'))
        // Transporte é a mais usada: vem antes de Mercado, fora da ordem alfabética.
        return HttpResponse.json([TRANSPORTE, MERCADO, SALARIO])
      }),
    )
    renderizarApp('/')

    await screen.findByRole('button', { name: 'Mercado' })
    const grupo = screen.getByRole('group', { name: 'Categoria' })
    const nomes = within(grupo)
      .getAllByRole('button')
      .map((botao) => botao.textContent)
    expect(nomes.slice(0, 2)).toEqual(['Transporte', 'Mercado'])
    expect(semRepetidos(pedidos)).toEqual(['USO'])
  })

  it('mostra 6 categorias; "Ver todas" mostra o resto, e a escolhida fica à vista (#187)', async () => {
    const muitas: Categoria[] = Array.from({ length: 8 }, (_, i) => ({
      ...MERCADO,
      id: `00000000-0000-4000-8000-00000000010${i}`,
      nome: `Gasto ${i + 1}`,
    }))
    servidor.use(http.get(`${API}/categorias`, () => HttpResponse.json(muitas)))
    const { usuario } = renderizarApp('/')
    await screen.findByRole('button', { name: 'Gasto 1' })
    const grupo = screen.getByRole('group', { name: 'Categoria' })
    const nomesNaGrade = () =>
      within(grupo)
        .getAllByRole('button')
        .map((botao) => botao.textContent)

    expect(nomesNaGrade()).toEqual([
      'Gasto 1',
      'Gasto 2',
      'Gasto 3',
      'Gasto 4',
      'Gasto 5',
      'Gasto 6',
      'Ver todas',
    ])

    await usuario.click(
      within(grupo).getByRole('button', { name: 'Ver todas' }),
    )
    expect(nomesNaGrade()).toHaveLength(9) // 8 categorias + "Ver menos"
    await usuario.click(
      within(grupo).getByRole('button', { name: 'Ver menos' }),
    )
    expect(nomesNaGrade()).toHaveLength(7)

    await usuario.click(
      within(grupo).getByRole('button', { name: 'Ver todas' }),
    )
    await usuario.click(within(grupo).getByRole('button', { name: 'Gasto 8' }))

    // A grade volta a ter 6, com a escolhida no lugar da 6ª.
    expect(nomesNaGrade()).toEqual([
      'Gasto 1',
      'Gasto 2',
      'Gasto 3',
      'Gasto 4',
      'Gasto 5',
      'Gasto 8',
      'Ver todas',
    ])
    expect(
      within(grupo).getByRole('button', { name: 'Gasto 8' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('sem categorias do tipo, oferece o link para criar uma', async () => {
    servidor.use(
      http.get(`${API}/categorias`, () => HttpResponse.json([SALARIO])),
    )
    renderizarApp('/')

    expect(
      await screen.findByRole('link', { name: 'Criar uma categoria' }),
    ).toHaveAttribute('href', '/categorias')
  })
})
