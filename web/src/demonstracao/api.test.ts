import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buscarUsuarioAtual,
  cadastrar,
  entrar,
  excluirConta,
  sair,
  trocarSenha,
} from '../api/auth.ts'
import {
  atualizarCategoria,
  buscarCategoria,
  criarCategoria,
  excluirCategoria,
  listarCategorias,
} from '../api/categorias.ts'
import { ErroDaApi } from '../api/cliente.ts'
import { buscarResumo } from '../api/resumo.ts'
import { buscarSaldo } from '../api/saldo.ts'
import {
  atualizarTransacao,
  buscarTransacao,
  criarTransacao,
  excluirTransacao,
  listarTransacoes,
} from '../api/transacoes.ts'
import { servidor } from '../testes/servidor.ts'
import { respostasDaDemonstracao } from './api.ts'
import {
  criarBancoDeExemplo,
  USUARIO_DE_EXEMPLO,
  type BancoDaDemonstracao,
} from './banco.ts'

const NOVEMBRO = { de: '2026-11-01', ate: '2026-11-30' }
const MERCADO = 'categoria-mercado'
const SALARIO = 'categoria-salario'

/** O status do erro que a promessa devolveu (ou falha o teste, se ela não falhar). */
async function statusDoErro(promessa: Promise<unknown>): Promise<number> {
  const erro = await promessa.then(
    () => {
      throw new Error('era para dar erro')
    },
    (falha: unknown) => falha,
  )
  expect(erro).toBeInstanceOf(ErroDaApi)
  return (erro as ErroDaApi).status
}

describe('API da demonstração (#162)', () => {
  let banco: BancoDaDemonstracao

  beforeEach(() => {
    // "Hoje" fixo: quarta, 18/11/2026. Os dados de exemplo e as "mais usadas" dependem da data.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 18, 10, 0))
    banco = criarBancoDeExemplo()
    servidor.use(...respostasDaDemonstracao(banco))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('dados de exemplo', () => {
    it('tem três meses de lançamentos, sem nada depois de hoje', () => {
      const meses = new Set(banco.transacoes.map((t) => t.data.slice(0, 7)))
      expect([...meses].sort()).toEqual(['2026-09', '2026-10', '2026-11'])
      expect(banco.transacoes.every((t) => t.data <= '2026-11-18')).toBe(true)
    })

    it('usa as categorias do sistema e varia os valores de um mês para o outro', () => {
      expect(banco.categorias.every((c) => c.sistema)).toBe(true)
      const feiras = banco.transacoes
        .filter((t) => t.descricao === 'Feira')
        .map((t) => t.valor)
      expect(new Set(feiras).size).toBe(feiras.length)
      const salarios = banco.transacoes
        .filter((t) => t.categoria.id === SALARIO)
        .map((t) => t.valor)
      expect(new Set(salarios)).toEqual(new Set([4800]))
    })
  })

  describe('sessão', () => {
    it('já começa logada; sair e entrar de novo com qualquer e-mail', async () => {
      expect(await buscarUsuarioAtual()).toEqual(USUARIO_DE_EXEMPLO)

      await sair()
      expect(await statusDoErro(buscarUsuarioAtual())).toBe(401)
      expect(
        await statusDoErro(trocarSenha({ senhaAtual: 'a', novaSenha: 'b' })),
      ).toBe(401)

      const usuario = await entrar({ email: 'eu@teste.com', senha: 'x' })
      expect(usuario.email).toBe('eu@teste.com')
      expect(await buscarUsuarioAtual()).toEqual(usuario)
      await trocarSenha({ senhaAtual: 'x', novaSenha: 'outra-senha' })
    })

    it('criar conta entra direto; excluir a conta sai e volta aos dados de exemplo', async () => {
      await cadastrar({ email: 'nova@teste.com', senha: 'senha-longa' })
      await excluirTransacao('demonstracao-0-0')

      await excluirConta({ senha: 'senha-longa' })

      expect(banco.logado).toBe(false)
      expect(banco.usuario).toEqual(USUARIO_DE_EXEMPLO)
      expect(banco.transacoes.some((t) => t.id === 'demonstracao-0-0')).toBe(
        true,
      )
    })
  })

  describe('categorias', () => {
    it('lista por tipo e em ordem alfabética, ou as mais usadas primeiro', async () => {
      const todas = await listarCategorias()
      expect(todas[0]).toMatchObject({
        nome: 'Alimentação fora',
        tipo: 'DESPESA',
      })
      expect(todas.at(-1)).toMatchObject({ nome: 'Salário', tipo: 'RECEITA' })

      const receitas = await listarCategorias('RECEITA')
      expect(receitas.every((c) => c.tipo === 'RECEITA')).toBe(true)

      const maisUsadas = await listarCategorias(undefined, 'USO')
      expect(maisUsadas[0].nome).toBe('Mercado')
    })

    it('cria, renomeia (os lançamentos mostram o nome novo) e exclui', async () => {
      const pets = await criarCategoria({ nome: ' Pets ', tipo: 'DESPESA' })
      expect(pets).toMatchObject({ nome: 'Pets', sistema: false })
      expect(await buscarCategoria(pets.id)).toEqual(pets)

      await criarTransacao({
        id: 'racao',
        valor: 80,
        data: '2026-11-18',
        categoriaId: pets.id,
      })
      await atualizarCategoria(pets.id, { nome: 'Animais' })
      expect((await buscarTransacao('racao')).categoria.nome).toBe('Animais')

      // Com lançamento, não dá para excluir; sem, dá.
      expect(await statusDoErro(excluirCategoria(pets.id))).toBe(409)
      await excluirTransacao('racao')
      await excluirCategoria(pets.id)
      expect(await statusDoErro(buscarCategoria(pets.id))).toBe(404)
    })

    it('recusa nome repetido e mudar ou excluir categoria do sistema', async () => {
      expect(
        await statusDoErro(
          criarCategoria({ nome: 'mercado', tipo: 'DESPESA' }),
        ),
      ).toBe(409)
      const pets = await criarCategoria({ nome: 'Pets', tipo: 'DESPESA' })
      expect(
        await statusDoErro(atualizarCategoria(pets.id, { nome: 'Lazer' })),
      ).toBe(409)
      expect(
        await statusDoErro(atualizarCategoria(MERCADO, { nome: 'Feira' })),
      ).toBe(409)
      expect(await statusDoErro(excluirCategoria(MERCADO))).toBe(409)
      expect(
        await statusDoErro(atualizarCategoria('nao-existe', { nome: 'X' })),
      ).toBe(404)
      expect(await statusDoErro(excluirCategoria('nao-existe'))).toBe(404)
    })
  })

  describe('transações', () => {
    it('lista o período da mais recente para a mais antiga, em páginas', async () => {
      const primeira = await listarTransacoes({
        periodo: NOVEMBRO,
        tamanho: 3,
      })
      expect(primeira.itens.map((t) => t.data)).toEqual([
        '2026-11-17',
        '2026-11-14',
        '2026-11-12',
      ])
      expect(primeira.temMais).toBe(true)

      const ultima = await listarTransacoes({
        periodo: NOVEMBRO,
        tamanho: 3,
        pagina: 3,
      })
      expect(ultima.itens.map((t) => t.data)).toEqual([
        '2026-11-03',
        '2026-11-01',
      ])
      expect(ultima.temMais).toBe(false)
    })

    it('no mesmo dia, a criada por último aparece primeiro', async () => {
      await criarTransacao({
        id: 'cafe',
        valor: 9,
        data: '2026-11-17',
        categoriaId: MERCADO,
      })
      const pagina = await listarTransacoes({ periodo: NOVEMBRO })
      expect(pagina.itens[0].id).toBe('cafe')
    })

    it('filtra por texto, tipo, categoria e valor', async () => {
      const feira = await listarTransacoes({ descricao: 'FEIRA' })
      expect(feira.itens).toHaveLength(3) // uma por mês
      expect(feira.itens.every((t) => t.descricao === 'Feira')).toBe(true)

      const receitas = await listarTransacoes({
        periodo: NOVEMBRO,
        tipo: 'RECEITA',
      })
      expect(receitas.itens.map((t) => t.categoria.nome)).toEqual(['Salário'])

      const mercado = await listarTransacoes({
        periodo: NOVEMBRO,
        categoriaId: MERCADO,
        valorMinimo: 100,
        valorMaximo: 400,
      })
      expect(mercado.itens.map((t) => t.descricao)).toEqual(['Compra do mês'])
    })

    it('cria sem duplicar no reenvio, edita, exclui e recusa reenviar o excluído', async () => {
      const nova = {
        id: 'almoco',
        valor: 32.5,
        data: '2026-11-18',
        descricao: '  Almoço ',
        categoriaId: 'categoria-alimentacao-fora',
      }
      const criada = await criarTransacao(nova)
      expect(criada).toMatchObject({ descricao: 'Almoço', valor: 32.5 })
      await criarTransacao(nova)
      expect(banco.transacoes.filter((t) => t.id === 'almoco')).toHaveLength(1)

      const editada = await atualizarTransacao('almoco', {
        valor: 40,
        data: '2026-11-17',
        descricao: '',
        categoriaId: MERCADO,
      })
      expect(editada).toMatchObject({
        valor: 40,
        descricao: null,
        categoria: { nome: 'Mercado' },
      })

      await excluirTransacao('almoco')
      expect(await statusDoErro(buscarTransacao('almoco'))).toBe(404)
      expect(await statusDoErro(criarTransacao(nova))).toBe(410)
    })

    it('sem id, cria um; categoria inexistente e transação inexistente dão erro', async () => {
      const semId = await criarTransacao({
        valor: 1,
        data: '2026-11-18',
        categoriaId: MERCADO,
      })
      expect(semId.id).toBeTruthy()
      expect(
        await statusDoErro(
          criarTransacao({ valor: 1, data: '2026-11-18', categoriaId: 'x' }),
        ),
      ).toBe(400)
      expect(
        await statusDoErro(
          atualizarTransacao(semId.id, {
            valor: 1,
            data: '2026-11-18',
            categoriaId: 'x',
          }),
        ),
      ).toBe(400)
      expect(
        await statusDoErro(
          atualizarTransacao('nao-existe', {
            valor: 1,
            data: '2026-11-18',
            categoriaId: MERCADO,
          }),
        ),
      ).toBe(404)
      expect(await statusDoErro(excluirTransacao('nao-existe'))).toBe(404)
    })
  })

  it('qualquer outro pedido para a API recebe um erro, sem sair do navegador', async () => {
    const resposta = await fetch('http://localhost/api/v1/qualquer-coisa')

    expect(resposta.status).toBe(501)
  })

  describe('saldo e resumo', () => {
    it('somam o período, com o percentual de cada categoria no seu tipo', async () => {
      // Novembro até o dia 18: salário 4800; despesas dos dias 1, 3, 8, 10, 12, 14 e 17.
      const despesas = 92.5 + 312.4 + 120 + 1450 + 189.9 + 64.9 + 86.3
      expect(await buscarSaldo(NOVEMBRO)).toEqual({
        ...NOVEMBRO,
        receitas: 4800,
        despesas: Math.round(despesas * 100) / 100,
        saldo: Math.round((4800 - despesas) * 100) / 100,
      })

      const resumo = await buscarResumo(NOVEMBRO)
      expect(resumo.receitas.categorias).toEqual([
        {
          id: SALARIO,
          nome: 'Salário',
          icone: 'wallet',
          cor: 'menta',
          total: 4800,
          quantidade: 1,
          percentual: 100,
        },
      ])
      expect(resumo.despesas.categorias[0]).toMatchObject({
        nome: 'Moradia',
        total: 1450,
      })
      expect(
        resumo.despesas.categorias.find((c) => c.id === MERCADO),
      ).toMatchObject({ quantidade: 2, total: 398.7 })
    })
  })
})
