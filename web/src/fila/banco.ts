import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Categoria, NovaTransacao, Usuario } from '../api/tipos.ts'

/**
 * O banco do app no aparelho (IndexedDB), para lançar sem internet (#100, ADR-0019).
 *
 * Guarda só três coisas, e nada mais:
 * - `fila`: os lançamentos que ainda não foram confirmados pelo servidor. Cada um sai daqui
 *   assim que o servidor confirma.
 * - `categorias`: a última lista recebida da API, para escolher a categoria sem internet.
 * - `sessao`: quem entrou por último neste aparelho (id e e-mail), para o app abrir sem internet e
 *   para saber de quem é cada lançamento da fila (M5, ADR-0027). Nunca guarda senha nem token.
 *
 * Tudo isto é apagado quando a pessoa sai da conta, exclui a conta ou outra conta entra.
 *
 * Este módulo é usado pelo app e também pelo service worker (src/sw.ts), por isso não usa nada
 * que só existe na página (window, document).
 */

/** Por que o servidor recusou um lançamento da fila. */
export type MotivoDaRecusa = 'excluida' | 'invalida'

export type LancamentoNaFila = {
  /** O id do lançamento, gerado no aparelho; é o mesmo em todos os reenvios. */
  id: string
  /**
   * De quem é o lançamento (id do usuário que estava logado quando ele foi feito). Lançamentos
   * de antes do M5 não têm dono: quem entrar primeiro os adota (`prepararParaOUsuario`).
   */
  usuarioId?: string
  /** O corpo do POST, exatamente como será enviado. */
  corpo: NovaTransacao & { id: string }
  /** Quando entrou na fila (milissegundos): a fila é enviada nessa ordem. */
  guardadoEm: number
  /** `pendente`: espera a próxima tentativa. `recusado`: espera a pessoa decidir. */
  situacao: 'pendente' | 'recusado'
  motivo?: MotivoDaRecusa
  /** Mensagem do servidor, para mostrar na tela. */
  mensagem?: string
}

interface EsquemaDoBanco extends DBSchema {
  fila: { key: string; value: LancamentoNaFila }
  /** Um registro só ("lista"), com as categorias na ordem em que a API mandou. */
  categorias: { key: string; value: { id: 'lista'; categorias: Categoria[] } }
  /** Um registro só ("atual"), com quem entrou por último neste aparelho. */
  sessao: { key: string; value: { id: 'atual'; usuario: Usuario } }
}

const NOME_DO_BANCO = 'easy-finance'
const VERSAO_DO_BANCO = 2

let conexao: Promise<IDBPDatabase<EsquemaDoBanco>> | null = null

/**
 * Abre o banco (uma vez só; as próximas chamadas reaproveitam a conexão). O `upgrade` roda
 * quando o banco ainda não existe no aparelho, ou quando a versão sobe: é o equivalente às
 * migrations do Flyway, aqui no navegador.
 */
function banco(): Promise<IDBPDatabase<EsquemaDoBanco>> {
  conexao ??= openDB<EsquemaDoBanco>(NOME_DO_BANCO, VERSAO_DO_BANCO, {
    upgrade(db, versaoAntiga) {
      // Versão 1 (M4): fila e categorias. Versão 2 (M5): quem entrou por último.
      if (versaoAntiga < 1) {
        db.createObjectStore('fila', { keyPath: 'id' })
        db.createObjectStore('categorias', { keyPath: 'id' })
      }
      if (versaoAntiga < 2) {
        db.createObjectStore('sessao', { keyPath: 'id' })
      }
    },
  })
  return conexao
}

/* ------------------------------------------------------------------ fila */

/**
 * Põe um lançamento na fila, como pendente, com o dono de quem está logado neste aparelho. Se o
 * id já estiver lá, ele é substituído.
 */
export async function guardarNaFila(
  corpo: NovaTransacao & { id: string },
): Promise<void> {
  const db = await banco()
  const dono = await db.get('sessao', 'atual')
  await db.put('fila', {
    id: corpo.id,
    usuarioId: dono?.usuario.id,
    corpo,
    guardadoEm: Date.now(),
    situacao: 'pendente',
  })
}

/** Todos os lançamentos da fila, do mais antigo para o mais novo. */
export async function lerFila(): Promise<LancamentoNaFila[]> {
  const todos = await (await banco()).getAll('fila')
  return todos.sort((a, b) => a.guardadoEm - b.guardadoEm)
}

export async function tirarDaFila(id: string): Promise<void> {
  await (await banco()).delete('fila', id)
}

/** Marca um lançamento como recusado pelo servidor: ele fica parado até a pessoa decidir. */
export async function marcarComoRecusado(
  id: string,
  motivo: MotivoDaRecusa,
  mensagem: string,
): Promise<void> {
  const db = await banco()
  const lancamento = await db.get('fila', id)
  if (lancamento) {
    await db.put('fila', {
      ...lancamento,
      situacao: 'recusado',
      motivo,
      mensagem,
    })
  }
}

/* ------------------------------------------------------------ categorias */

/**
 * Troca a cópia das categorias pela lista recebida agora da API. Guardada como um registro só
 * para manter a ordem (na tela de lançamento, as mais usadas primeiro).
 */
export async function guardarCategorias(
  categorias: Categoria[],
): Promise<void> {
  await (await banco()).put('categorias', { id: 'lista', categorias })
}

/** A última lista de categorias guardada (vazia se o app nunca carregou com internet). */
export async function lerCategorias(): Promise<Categoria[]> {
  return (await (await banco()).get('categorias', 'lista'))?.categorias ?? []
}

/* ---------------------------------------------------------------- sessão */

/** Quem entrou por último neste aparelho, ou `undefined` se ninguém (ou se foi apagado). */
export async function lerUsuarioDoAparelho(): Promise<Usuario | undefined> {
  return (await (await banco()).get('sessao', 'atual'))?.usuario
}

/** Quantos lançamentos há na fila (pendentes e recusados): o que se perde ao apagar os dados. */
export async function contarNaFila(): Promise<number> {
  return (await (await banco()).getAllKeys('fila')).length
}

/**
 * Apaga tudo que o app guarda no aparelho: a fila, as categorias e quem entrou por último. É o
 * que acontece ao sair, ao excluir a conta e ao entrar com outra conta (ADR-0027): os dados de
 * uma pessoa nunca ficam para a próxima.
 */
export async function apagarDadosDoAparelho(): Promise<void> {
  const db = await banco()
  const transacao = db.transaction(
    ['fila', 'categorias', 'sessao'],
    'readwrite',
  )
  await Promise.all([
    transacao.objectStore('fila').clear(),
    transacao.objectStore('categorias').clear(),
    transacao.objectStore('sessao').clear(),
    transacao.done,
  ])
}

/**
 * Prepara o aparelho para `usuario` acabar de entrar (ou de ser reconhecido ao abrir o app).
 *
 * - Se quem entrou por último era OUTRA pessoa, apaga tudo dela e devolve quantos lançamentos
 *   haviam na fila, para a tela avisar, e `trocouDePessoa` (para a sessão apagar também as
 *   preferências do aparelho, #195, que ficam fora daqui porque este arquivo roda também no
 *   service worker, onde não há localStorage).
 * - Lançamentos antigos, sem dono, passam a ser de `usuario`.
 * - Guarda `usuario` como quem entrou por último.
 */
export async function prepararParaOUsuario(
  usuario: Usuario,
): Promise<{ descartados: number; trocouDePessoa: boolean }> {
  let descartados = 0
  const anterior = await lerUsuarioDoAparelho()
  const trocouDePessoa = anterior !== undefined && anterior.id !== usuario.id
  if (trocouDePessoa) {
    descartados = await contarNaFila()
    await apagarDadosDoAparelho()
  }
  const db = await banco()
  const transacao = db.transaction(['fila', 'sessao'], 'readwrite')
  const fila = transacao.objectStore('fila')
  for (const lancamento of await fila.getAll()) {
    if (lancamento.usuarioId === undefined) {
      await fila.put({ ...lancamento, usuarioId: usuario.id })
    }
  }
  await transacao.objectStore('sessao').put({ id: 'atual', usuario })
  await transacao.done
  return { descartados, trocouDePessoa }
}

/* ---------------------------------------------------------------- testes */

/** Só para os testes: fecha e apaga o banco, para cada teste começar do zero. */
export async function apagarBancoDosTestes(): Promise<void> {
  if (conexao) {
    ;(await conexao).close()
    conexao = null
  }
  await new Promise<void>((resolver, rejeitar) => {
    const pedido = indexedDB.deleteDatabase(NOME_DO_BANCO)
    pedido.onsuccess = () => resolver()
    pedido.onerror = () => rejeitar(pedido.error)
  })
}
