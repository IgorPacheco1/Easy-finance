import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'
import type { NovaCategoria } from '../api/tipos.ts'
import { respostasPadrao, TRANSPORTE } from '../testes/dados.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { API, servidor } from '../testes/servidor.ts'

const PROBLEMA = { 'Content-Type': 'application/problem+json' }

async function abrirCategorias() {
  const tela = renderizarApp('/categorias')
  await screen.findByRole('heading', { level: 2, name: 'Despesas' })
  return tela
}

/** A seção "Despesas" ou "Receitas" da tela. */
const secao = (titulo: string) => screen.getByRole('region', { name: titulo })

describe('tela de categorias', () => {
  beforeEach(() => {
    servidor.use(...respostasPadrao())
  })

  it('separa despesas e receitas em ordem alfabética; as do sistema são "Padrão" e não têm ações', async () => {
    await abrirCategorias()

    const despesas = within(secao('Despesas')).getAllByRole('listitem')
    expect(despesas.map((item) => item.textContent)).toEqual([
      'MercadoPadrão',
      'Transporte',
    ])
    expect(within(secao('Receitas')).getByText('Salário')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Renomear Mercado' }),
    ).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Renomear Transporte' }),
    ).toBeInTheDocument()
  })

  it('cria uma categoria de receita e mostra na seção certa', async () => {
    const enviadas: NovaCategoria[] = []
    servidor.use(
      http.post(`${API}/categorias`, async ({ request }) => {
        const corpo = (await request.json()) as NovaCategoria
        enviadas.push(corpo)
        return HttpResponse.json(
          { id: 'nova', ...corpo, sistema: false },
          { status: 201 },
        )
      }),
    )
    const { usuario } = await abrirCategorias()

    await usuario.click(screen.getByRole('button', { name: 'Nova' }))
    const formulario = screen.getByRole('form', { name: 'Nova categoria' })
    await usuario.type(within(formulario).getByLabelText('Nome'), ' Freela ')
    await usuario.click(
      within(formulario).getByRole('button', { name: 'Receita' }),
    )
    await usuario.click(
      within(formulario).getByRole('button', { name: 'Criar categoria' }),
    )

    expect(
      await screen.findByText('Categoria Freela criada.'),
    ).toBeInTheDocument()
    expect(enviadas).toEqual([{ nome: 'Freela', tipo: 'RECEITA' }])
    expect(within(secao('Receitas')).getByText('Freela')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Nova categoria' })).toBeNull()
  })

  it('não envia um nome que já existe (sem diferenciar maiúsculas)', async () => {
    let enviou = false
    servidor.use(
      http.post(`${API}/categorias`, () => {
        enviou = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { usuario } = await abrirCategorias()

    await usuario.click(screen.getByRole('button', { name: 'Nova' }))
    await usuario.type(screen.getByLabelText('Nome'), 'mercado')
    await usuario.click(screen.getByRole('button', { name: 'Criar categoria' }))

    expect(
      screen.getByText('Já existe uma categoria chamada "Mercado".'),
    ).toBeInTheDocument()
    expect(enviou).toBe(false)
  })

  it('renomeia uma categoria personalizada', async () => {
    servidor.use(
      http.put(`${API}/categorias/:id`, async ({ request, params }) => {
        const { nome } = (await request.json()) as { nome: string }
        return HttpResponse.json({ ...TRANSPORTE, id: params.id, nome })
      }),
    )
    const { usuario } = await abrirCategorias()

    await usuario.click(
      screen.getByRole('button', { name: 'Renomear Transporte' }),
    )
    const campo = screen.getByLabelText('Novo nome')
    await usuario.clear(campo)
    await usuario.type(campo, 'Uber')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText('Categoria renomeada para Uber.'),
    ).toBeInTheDocument()
    expect(within(secao('Despesas')).getByText('Uber')).toBeInTheDocument()
    expect(within(secao('Despesas')).queryByText('Transporte')).toBeNull()
  })

  it('exclui depois de confirmar', async () => {
    servidor.use(
      http.delete(
        `${API}/categorias/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )
    const { usuario } = await abrirCategorias()

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir Transporte' }),
    )
    expect(screen.getByText('Excluir Transporte?')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(
      await screen.findByText('Categoria Transporte excluída.'),
    ).toBeInTheDocument()
    expect(within(secao('Despesas')).queryByText('Transporte')).toBeNull()
  })

  it('"Cancelar" na confirmação não exclui nada', async () => {
    const { usuario } = await abrirCategorias()

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir Transporte' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      within(secao('Despesas')).getByText('Transporte'),
    ).toBeInTheDocument()
  })

  it('quando a categoria está em uso, mostra a explicação da API e mantém na lista', async () => {
    servidor.use(
      http.delete(`${API}/categorias/:id`, () =>
        HttpResponse.json(
          {
            status: 409,
            title: 'Conflito',
            detail: 'A categoria tem transações e não pode ser excluída.',
          },
          { status: 409, headers: PROBLEMA },
        ),
      ),
    )
    const { usuario } = await abrirCategorias()

    await usuario.click(
      screen.getByRole('button', { name: 'Excluir Transporte' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A categoria tem transações e não pode ser excluída.',
    )
    await usuario.click(screen.getByRole('button', { name: 'Entendi' }))
    expect(
      within(secao('Despesas')).getByText('Transporte'),
    ).toBeInTheDocument()
  })
})
