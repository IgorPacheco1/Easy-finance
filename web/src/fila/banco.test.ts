import { beforeEach, describe, expect, it } from 'vitest'
import { MERCADO, USUARIO } from '../testes/dados.ts'
import {
  apagarBancoDosTestes,
  apagarDadosDoAparelho,
  contarNaFila,
  guardarCategorias,
  guardarNaFila,
  lerCategorias,
  lerFila,
  lerUsuarioDoAparelho,
  prepararParaOUsuario,
} from './banco.ts'

const OUTRO = {
  id: '00000000-0000-4000-8000-0000000000f2',
  email: 'bia@email.com',
  nome: 'Bia',
  avatar: 'iniciais:cinza',
}

function novo(id: string) {
  return { id, valor: 10, data: '2026-11-05', categoriaId: MERCADO.id }
}

describe('dados do aparelho por usuário (#130)', () => {
  beforeEach(async () => {
    await apagarBancoDosTestes()
  })

  it('guarda quem entrou e marca os lançamentos novos com o dono', async () => {
    await prepararParaOUsuario(USUARIO)
    await guardarNaFila(novo('a'))

    expect(await lerUsuarioDoAparelho()).toEqual(USUARIO)
    expect((await lerFila())[0].usuarioId).toBe(USUARIO.id)
  })

  it('o mesmo usuário entrando de novo não perde nada', async () => {
    await prepararParaOUsuario(USUARIO)
    await guardarNaFila(novo('a'))

    const resultado = await prepararParaOUsuario(USUARIO)

    expect(resultado.descartados).toBe(0)
    expect(await contarNaFila()).toBe(1)
  })

  it('outra conta entrando apaga a fila e as categorias da anterior e conta o que descartou', async () => {
    await prepararParaOUsuario(USUARIO)
    await guardarNaFila(novo('a'))
    await guardarNaFila(novo('b'))
    await guardarCategorias([MERCADO])

    const resultado = await prepararParaOUsuario(OUTRO)

    expect(resultado.descartados).toBe(2)
    expect(await lerFila()).toEqual([])
    expect(await lerCategorias()).toEqual([])
    expect(await lerUsuarioDoAparelho()).toEqual(OUTRO)
  })

  it('lançamentos sem dono (de antes do M5) ficam com quem entrar primeiro', async () => {
    // Sem ninguém guardado no aparelho, o lançamento nasce sem dono.
    await guardarNaFila(novo('antigo'))
    expect((await lerFila())[0].usuarioId).toBeUndefined()

    const resultado = await prepararParaOUsuario(USUARIO)

    expect(resultado.descartados).toBe(0)
    expect((await lerFila())[0].usuarioId).toBe(USUARIO.id)
  })

  it('apagarDadosDoAparelho limpa fila, categorias e usuário', async () => {
    await prepararParaOUsuario(USUARIO)
    await guardarNaFila(novo('a'))
    await guardarCategorias([MERCADO])

    await apagarDadosDoAparelho()

    expect(await contarNaFila()).toBe(0)
    expect(await lerCategorias()).toEqual([])
    expect(await lerUsuarioDoAparelho()).toBeUndefined()
  })
})
