import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('numa tela de dentro da Conta, o link Conta continua marcado como atual', () => {
    renderizarApp('/conta/privacidade')

    expect(screen.getByRole('link', { name: 'Conta' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    // O "Lançar" ("/") só fica marcado no "/" exato.
    expect(screen.getByRole('link', { name: 'Lançar' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('trocar de tela recria o bloco do conteúdo, para a entrada animar; trocar de mês não (#196)', async () => {
    const { usuario } = renderizarApp('/mes')
    await screen.findByText('Saldo do mês')
    // O bloco que anima fica logo dentro da coluna do conteúdo.
    const bloco = () =>
      screen.getByRole('main').firstElementChild?.firstElementChild
    const noMes = bloco()

    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(bloco()).toBe(noMes)

    await usuario.click(screen.getByRole('link', { name: 'Categorias' }))
    expect(bloco()).not.toBe(noMes)
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

/**
 * Faz de conta que a janela tem a largura de um computador (ou não). O jsdom não tem
 * `matchMedia` nem calcula CSS: o teste combina a resposta da "consulta de mídia" e confere qual
 * navegação o app desenhou. `mudarPara` simula a janela sendo redimensionada.
 */
function simularTela(larga: boolean) {
  const ouvintes = new Set<() => void>()
  const lista = {
    get matches() {
      return larga
    },
    addEventListener: (_evento: string, ouvinte: () => void) =>
      ouvintes.add(ouvinte),
    removeEventListener: (_evento: string, ouvinte: () => void) =>
      ouvintes.delete(ouvinte),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => lista),
  )
  return {
    mudarPara(novaLarga: boolean) {
      larga = novaLarga
      act(() => ouvintes.forEach((ouvinte) => ouvinte()))
    },
  }
}

const navegacao = () =>
  screen.getByRole('navigation', { name: 'Navegação principal' })

describe('layout do computador (#161)', () => {
  beforeEach(() => {
    servidor.use(...respostasPadrao())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('no celular, a navegação fica embaixo, sem a logo', async () => {
    simularTela(false)
    renderizarApp('/')

    // A navegação inferior vem depois do conteúdo; só existe uma navegação principal.
    expect(within(navegacao()).queryByText('Guardá')).not.toBeInTheDocument()
    expect(screen.getByRole('main').compareDocumentPosition(navegacao())).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    await screen.findByRole('button', { name: 'Mercado' })
  })

  it('no computador, a navegação fica na lateral, com a logo, antes do conteúdo', async () => {
    simularTela(true)
    const { usuario, roteador } = renderizarApp('/')

    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(within(navegacao()).getByText('Guardá')).toBeInTheDocument()
    expect(navegacao().compareDocumentPosition(screen.getByRole('main'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    await screen.findByRole('button', { name: 'Mercado' })

    // Os mesmos destinos, marcando a tela atual.
    await usuario.click(within(navegacao()).getByRole('link', { name: 'Mês' }))
    expect(roteador.state.location.pathname).toBe('/mes')
    expect(
      within(navegacao()).getByRole('link', { name: 'Mês' }),
    ).toHaveAttribute('aria-current', 'page')
    await screen.findByText('Saldo do mês')
  })

  it('troca de navegação quando a janela muda de tamanho, sem sair da tela', async () => {
    const tela = simularTela(false)
    const { roteador } = renderizarApp('/categorias')
    await screen.findByText('Mercado')

    tela.mudarPara(true)
    expect(within(navegacao()).getByText('Guardá')).toBeInTheDocument()

    tela.mudarPara(false)
    expect(within(navegacao()).queryByText('Guardá')).not.toBeInTheDocument()
    expect(roteador.state.location.pathname).toBe('/categorias')
  })

  it('o primeiro Tab mostra "Pular para o conteúdo", que leva o foco para a tela', async () => {
    simularTela(true)
    const { usuario } = renderizarApp('/categorias')
    await screen.findByText('Mercado')

    await usuario.tab()
    const pular = screen.getByRole('link', { name: 'Pular para o conteúdo' })
    expect(pular).toHaveFocus()

    await usuario.keyboard('{Enter}')
    expect(screen.getByRole('main')).toHaveFocus()
  })
})
