import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { respostasPadrao } from '../testes/dados.ts'
import { renderizarApp } from '../testes/renderizar.tsx'
import { servidor } from '../testes/servidor.ts'

/**
 * Primeiro teste de tela do projeto (#33): serve de modelo para os outros.
 *
 * Um teste de tela segue sempre três passos:
 *   1. Preparar: combinar as respostas da API falsa e desenhar a tela.
 *   2. Agir: fazer o que uma pessoa faria (tocar num botão, digitar).
 *   3. Conferir: olhar a tela como a pessoa olharia.
 *
 * Para achar os elementos, use o que a PESSOA vê, e não detalhes do código:
 *   - getByRole('link', { name: 'Mês' }): um link com o texto "Mês". É o jeito preferido,
 *     porque também confere a acessibilidade (o leitor de tela acha o elemento do mesmo jeito).
 *   - getByText('...'): um texto qualquer na tela.
 *   - getBy... falha na hora se não achar. findBy... espera um pouco (para o que depende de
 *     uma resposta da API). queryBy... devolve null em vez de falhar (para conferir que algo
 *     NÃO está na tela).
 */
describe('navegação', () => {
  beforeEach(() => {
    // Toda tela pede algo à API ao abrir; sem resposta combinada, o teste falha (configuracao.ts).
    servidor.use(...respostasPadrao())
  })

  it('abre na tela de lançamento, com o link Lançar marcado como atual', async () => {
    renderizarApp('/')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Lançar' }),
    ).toBeInTheDocument()
    // aria-current="page" é o que o leitor de tela anuncia como "página atual".
    expect(screen.getByRole('link', { name: 'Lançar' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    // Espera as categorias chegarem, para o teste não terminar no meio do carregamento.
    expect(await screen.findByRole('button', { name: 'Mercado' })).toBeVisible()
  })

  it('troca de tela pela navegação inferior', async () => {
    const { usuario, roteador } = renderizarApp('/')

    await usuario.click(screen.getByRole('link', { name: 'Categorias' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Categorias' }),
    ).toBeInTheDocument()
    expect(roteador.state.location.pathname).toBe('/categorias')
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    // Só um destino fica marcado por vez.
    expect(screen.getByRole('link', { name: 'Lançar' })).not.toHaveAttribute(
      'aria-current',
    )

    await usuario.click(screen.getByRole('link', { name: 'Mês' }))

    expect(roteador.state.location.pathname).toBe('/mes')
    expect(await screen.findByText('Saldo do mês')).toBeInTheDocument()
  })

  it('mostra a página não encontrada num endereço que não existe, com link de volta', async () => {
    const { usuario, roteador } = renderizarApp('/endereco-que-nao-existe')

    expect(
      screen.getByRole('heading', { name: 'Página não encontrada' }),
    ).toBeInTheDocument()

    await usuario.click(
      screen.getByRole('link', { name: 'Voltar para o lançamento' }),
    )

    expect(roteador.state.location.pathname).toBe('/')
  })
})
