import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Categoria, NovaTransacao } from '../api/tipos.ts'

/**
 * O banco do app no aparelho (IndexedDB), para lançar sem internet (#100, ADR-0019).
 *
 * Guarda só duas coisas, e nada mais:
 * - `fila`: os lançamentos que ainda não foram confirmados pelo servidor. Cada um sai daqui
 *   assim que o servidor confirma.
 * - `categorias`: a última lista recebida da API, para escolher a categoria sem internet.
 *
 * Este módulo é usado pelo app e também pelo service worker (src/sw.ts), por isso não usa nada
 * que só existe na página (window, document).
 */

/** Por que o servidor recusou um lançamento da fila. */
export type MotivoDaRecusa = 'excluida' | 'invalida'

export type LancamentoNaFila = {
  /** O id do lançamento, gerado no aparelho; é o mesmo em todos os reenvios. */
  id: string
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
}

const NOME_DO_BANCO = 'easy-finance'
const VERSAO_DO_BANCO = 1

let conexao: Promise<IDBPDatabase<EsquemaDoBanco>> | null = null

/**
 * Abre o banco (uma vez só; as próximas chamadas reaproveitam a conexão). O `upgrade` roda
 * quando o banco ainda não existe no aparelho, ou quando a versão sobe: é o equivalente às
 * migrations do Flyway, aqui no navegador.
 */
function banco(): Promise<IDBPDatabase<EsquemaDoBanco>> {
  conexao ??= openDB<EsquemaDoBanco>(NOME_DO_BANCO, VERSAO_DO_BANCO, {
    upgrade(db) {
      db.createObjectStore('fila', { keyPath: 'id' })
      db.createObjectStore('categorias', { keyPath: 'id' })
    },
  })
  return conexao
}

/* ------------------------------------------------------------------ fila */

/** Põe um lançamento na fila, como pendente. Se o id já estiver lá, ele é substituído. */
export async function guardarNaFila(
  corpo: NovaTransacao & { id: string },
): Promise<void> {
  await (
    await banco()
  ).put('fila', {
    id: corpo.id,
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
