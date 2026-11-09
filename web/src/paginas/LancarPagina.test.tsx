import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NovaTransacao } from '../api/tipos.ts'
import { guardarNaFila, lerCategorias, lerFila } from '../fila/banco.ts'
import {
  CATEGORIAS,
  MERCADO,
  respostasPadrao,
  SALARIO,
  transacao,
  TRANSPORTE,
} from '../testes/dados.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'

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

async function abrirLancar() {
  const tela = renderizarApp('/')
  // Espera as categorias carregarem antes de começar.
  await screen.findByRole('button', { name: 'Mercado' })
  return tela
}

const campoValor = () => screen.getByLabelText('Valor')

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

  it('começa em Despesa e Hoje, mostrando só as categorias de despesa', async () => {
    await abrirLancar()

    expect(screen.getByRole('button', { name: 'Despesa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Hoje' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
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
    expect(
      screen.getByRole('button', { name: 'Lançar receita' }),
    ).toBeInTheDocument()
  })

  it('digita o valor no estilo caixa registradora', async () => {
    const { usuario } = await abrirLancar()

    await usuario.type(campoValor(), '1290')

    expect(campoValor()).toHaveValue('12,90')
  })

  it('o dígito novo entra no fim mesmo se a pessoa tocar no começo do número', async () => {
    const { usuario } = await abrirLancar()
    await usuario.type(campoValor(), '290')

    // Toca no começo do campo (posição 0) e digita 5.
    await usuario.pointer({
      target: campoValor(),
      offset: 0,
      keys: '[MouseLeft]',
    })
    await usuario.keyboard('5')

    // 2,905 → 29,05 (o 5 entrou no fim), e não 52,90.
    expect(campoValor()).toHaveValue('29,05')
  })

  it('sem valor e sem categoria, mostra os erros e não envia nada', async () => {
    const envios = gravarEnvios()
    const { usuario } = await abrirLancar()

    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))

    expect(
      screen.getByText('O valor deve ser maior que zero.'),
    ).toBeInTheDocument()
    expect(screen.getByText('A categoria é obrigatória.')).toBeInTheDocument()
    expect(campoValor()).toHaveAttribute('aria-invalid', 'true')
    expect(envios).toHaveLength(0)
  })

  it('lança uma despesa, avisa e deixa a tela pronta para o próximo', async () => {
    const envios = gravarEnvios()
    const { usuario } = await abrirLancar()

    await usuario.type(campoValor(), '1290')
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))
    await usuario.type(
      screen.getByLabelText('Descrição (opcional)'),
      '  feira  ',
    )
    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))

    expect(
      await screen.findByText('Despesa de R$ 12,90 lançada.'),
    ).toBeInTheDocument()
    expect(envios).toEqual([
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        valor: 12.9,
        data: '2026-11-05',
        descricao: 'feira', // sem os espaços das pontas
        categoriaId: MERCADO.id,
      },
    ])
    // Pronto para o próximo: valor, categoria e descrição limpos; foco de volta no valor.
    expect(campoValor()).toHaveValue('0,00')
    expect(campoValor()).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Mercado' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue('')
  })

  it('lança com a data de Ontem', async () => {
    const envios = gravarEnvios()
    const { usuario } = await abrirLancar()

    await usuario.type(campoValor(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))
    await usuario.click(screen.getByRole('button', { name: 'Ontem' }))
    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))

    await screen.findByText('Despesa de R$ 5,00 lançada.')
    expect(envios[0].data).toBe('2026-11-04')
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
    await usuario.type(campoValor(), '1290')
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))
    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))
    const aviso = await screen.findByRole('status')

    await usuario.click(within(aviso).getByRole('button', { name: 'Desfazer' }))

    expect(await screen.findByText('Lançamento desfeito.')).toBeInTheDocument()
    expect(excluidos).toHaveLength(1)
  })

  it('sem conexão, guarda no aparelho e envia depois com o MESMO id (#100)', async () => {
    let falhar = true
    const envios = gravarEnvios(() =>
      falhar ? HttpResponse.error() : undefined,
    )
    const { usuario } = await abrirLancar()
    await usuario.type(campoValor(), '1290')
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))

    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))

    expect(
      await screen.findByText(
        'Sem conexão. Lançamento salvo no aparelho, será enviado quando a internet voltar.',
      ),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('1 lançamento aguardando envio.'),
    ).toBeInTheDocument()
    // O formulário fica pronto para o próximo, como num lançamento normal.
    expect(campoValor()).toHaveValue('0,00')

    falhar = false
    await usuario.click(screen.getByRole('button', { name: 'Enviar agora' }))

    await waitFor(() =>
      expect(screen.queryByText('1 lançamento aguardando envio.')).toBeNull(),
    )
    expect(envios).toHaveLength(2)
    expect(envios[1].id).toBe(envios[0].id)
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
    await usuario.type(campoValor(), '1290')
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))

    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Um lançamento anterior com outros dados já foi registrado.',
    )
    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))

    await screen.findByText('Despesa de R$ 12,90 lançada.')
    expect(envios[1].id).not.toBe(envios[0].id)
  })

  it('mostra embaixo do campo o erro que a API devolveu para ele', async () => {
    gravarEnvios(() =>
      HttpResponse.json(
        {
          status: 400,
          title: 'Dados inválidos',
          detail: 'Confira os campos.',
          erros: [{ campo: 'valor', mensagem: 'Valor alto demais.' }],
        },
        {
          status: 400,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      ),
    )
    const { usuario } = await abrirLancar()
    await usuario.type(campoValor(), '1290')
    await usuario.click(screen.getByRole('button', { name: 'Mercado' }))

    await usuario.click(screen.getByRole('button', { name: 'Lançar despesa' }))

    expect(await screen.findByText('Valor alto demais.')).toBeInTheDocument()
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
    expect(pedidos).toEqual(['USO'])
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

  it('"Outra data" abre o calendário com a data de hoje', async () => {
    const { usuario } = await abrirLancar()

    await usuario.click(screen.getByRole('button', { name: 'Outra data' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Escolha a data')).toHaveValue('2026-11-05'),
    )
  })
})
