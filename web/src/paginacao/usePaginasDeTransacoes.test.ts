import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PaginaDeTransacoes } from '../api/tipos.ts'
import { pagina, transacao } from '../testes/dados.ts'
import {
  usePaginasDeTransacoes,
  type FonteDeTransacoes,
} from './usePaginasDeTransacoes.ts'

/** Uma promessa que o teste resolve ou rejeita quando quiser. */
function pendente<T>() {
  let resolver!: (valor: T) => void
  let rejeitar!: (erro: unknown) => void
  const promessa = new Promise<T>((res, rej) => {
    resolver = res
    rejeitar = rej
  })
  return { promessa, resolver, rejeitar }
}

/**
 * Cria a fonte fora do renderHook, como as telas fazem no nível do módulo: uma fonte nova a cada
 * desenho faria o hook pedir a página 1 de novo sem parar.
 */
function fonteCom(
  buscarPagina: FonteDeTransacoes['buscarPagina'],
): FonteDeTransacoes {
  return {
    buscarPagina,
    tamanho: 10,
    erroAoCarregar: 'Falhou ao carregar.',
    mensagemDoErro: (_erro, padrao) => padrao,
  }
}

const A = transacao({ id: 'a' })
const B = transacao({ id: 'b' })
const C = transacao({ id: 'c' })

describe('usePaginasDeTransacoes', () => {
  it('começa carregando e pede a página 1 com o tamanho da fonte', async () => {
    const buscarPagina = vi.fn(() => Promise.resolve(pagina([A])))
    const fonte = fonteCom(buscarPagina)
    const { result } = renderHook(() => usePaginasDeTransacoes(fonte, 'nov'))

    expect(result.current.dados).toEqual({ situacao: 'carregando' })
    await waitFor(() => expect(result.current.dados.situacao).toBe('pronto'))
    expect(buscarPagina).toHaveBeenCalledWith('nov', 1, 10)
    expect(result.current.dados).toMatchObject({
      transacoes: [A],
      pagina: 1,
      temMais: false,
    })
  })

  it('carrega a próxima página e junta no fim, sem repetir', async () => {
    const fonte = fonteCom((_consulta, numero) =>
      Promise.resolve(
        numero === 1
          ? pagina([A, B], { temMais: true })
          : pagina([B, C], { pagina: 2 }),
      ),
    )
    const { result } = renderHook(() => usePaginasDeTransacoes(fonte, 'nov'))
    await waitFor(() => expect(result.current.dados.situacao).toBe('pronto'))

    act(() => result.current.carregarMais())

    await waitFor(() =>
      expect(result.current.dados).toMatchObject({
        transacoes: [A, B, C],
        pagina: 2,
        temMais: false,
        carregandoMais: false,
      }),
    )
  })

  it('sem próxima página, carregarMais não pede nada', async () => {
    const buscarPagina = vi.fn(() => Promise.resolve(pagina([A])))
    const fonte = fonteCom(buscarPagina)
    const { result } = renderHook(() => usePaginasDeTransacoes(fonte, 'nov'))
    await waitFor(() => expect(result.current.dados.situacao).toBe('pronto'))

    act(() => result.current.carregarMais())

    expect(buscarPagina).toHaveBeenCalledTimes(1)
  })

  it('carregarMais duas vezes seguidas faz um pedido só', async () => {
    const segunda = pendente<PaginaDeTransacoes>()
    const buscarPagina = vi.fn((_consulta: string, numero: number) =>
      numero === 1
        ? Promise.resolve(pagina([A], { temMais: true }))
        : segunda.promessa,
    )
    const fonte = fonteCom(buscarPagina)
    const { result } = renderHook(() => usePaginasDeTransacoes(fonte, 'nov'))
    await waitFor(() => expect(result.current.dados.situacao).toBe('pronto'))

    act(() => {
      result.current.carregarMais()
      result.current.carregarMais()
    })

    expect(buscarPagina).toHaveBeenCalledTimes(2)
    expect(result.current.dados).toMatchObject({ carregandoMais: true })
    await act(async () => segunda.resolver(pagina([B], { pagina: 2 })))
    expect(result.current.dados).toMatchObject({ transacoes: [A, B] })
  })

  it('se a página 1 falha, mostra o erro e "tentar de novo" pede outra vez', async () => {
    let falhar = true
    const fonte = fonteCom(() =>
      falhar ? Promise.reject(new Error('rede')) : Promise.resolve(pagina([A])),
    )
    const { result } = renderHook(() => usePaginasDeTransacoes(fonte, 'nov'))

    await waitFor(() =>
      expect(result.current.dados).toEqual({
        situacao: 'erro',
        mensagem: 'Falhou ao carregar.',
      }),
    )

    falhar = false
    act(() => result.current.tentarDeNovo())

    expect(result.current.dados).toEqual({ situacao: 'carregando' })
    await waitFor(() =>
      expect(result.current.dados).toMatchObject({ transacoes: [A] }),
    )
  })

  it('se a próxima página falha, mantém a lista e mostra o erro dela', async () => {
    let falhar = true
    const fonte = fonteCom((_consulta, numero) => {
      if (numero === 1) return Promise.resolve(pagina([A], { temMais: true }))
      return falhar
        ? Promise.reject(new Error('rede'))
        : Promise.resolve(pagina([B], { pagina: 2 }))
    })
    const { result } = renderHook(() => usePaginasDeTransacoes(fonte, 'nov'))
    await waitFor(() => expect(result.current.dados.situacao).toBe('pronto'))

    act(() => result.current.carregarMais())

    await waitFor(() =>
      expect(result.current.dados).toMatchObject({
        transacoes: [A],
        carregandoMais: false,
        erroAoCarregarMais: 'Não foi possível carregar mais lançamentos.',
      }),
    )

    falhar = false
    act(() => result.current.carregarMais())

    await waitFor(() =>
      expect(result.current.dados).toMatchObject({
        transacoes: [A, B],
        erroAoCarregarMais: null,
      }),
    )
  })

  it('quando a consulta muda, recomeça da página 1 e ignora a resposta atrasada da antiga', async () => {
    const antiga = pendente<PaginaDeTransacoes>()
    const fonte = fonteCom((consulta) =>
      consulta === 'out' ? antiga.promessa : Promise.resolve(pagina([B])),
    )
    const { result, rerender } = renderHook(
      ({ consulta }) => usePaginasDeTransacoes(fonte, consulta),
      { initialProps: { consulta: 'out' } },
    )

    rerender({ consulta: 'nov' })
    await waitFor(() =>
      expect(result.current.dados).toMatchObject({ transacoes: [B] }),
    )

    // A resposta da consulta antiga chega depois: não pode aparecer na nova.
    await act(async () => antiga.resolver(pagina([A])))
    expect(result.current.dados).toMatchObject({ transacoes: [B] })
  })
})
