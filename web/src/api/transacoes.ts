import { requisicao } from './cliente.ts'
import type {
  NovaTransacao,
  PaginaDeTransacoes,
  Periodo,
  Transacao,
  TransacaoEditada,
} from './tipos.ts'

/** Filtros da listagem. Sem `pagina` e `tamanho`, a API devolve a página 1 com 20 itens. */
export type FiltroDeTransacoes = {
  periodo?: Periodo
  /** Começa em 1. */
  pagina?: number
  /** De 1 a 100. */
  tamanho?: number
}

/**
 * Uma página das transações (da mais recente para a mais antiga); com `periodo`, só as do
 * período. Para a próxima página, peça `pagina + 1` enquanto `temMais` for true (ADR-0017).
 */
export function listarTransacoes(
  filtro: FiltroDeTransacoes = {},
): Promise<PaginaDeTransacoes> {
  const { periodo, pagina, tamanho } = filtro
  return requisicao('GET', '/transacoes', {
    parametros: {
      de: periodo?.de,
      ate: periodo?.ate,
      pagina: pagina?.toString(),
      tamanho: tamanho?.toString(),
    },
  })
}

export function buscarTransacao(id: string): Promise<Transacao> {
  return requisicao('GET', `/transacoes/${encodeURIComponent(id)}`)
}

/**
 * Cria uma transação. Envie o `id` (gerado com crypto.randomUUID()) para poder reenviar sem
 * duplicar: o mesmo id com os mesmos dados devolve a transação que já existe (#19).
 */
export function criarTransacao(nova: NovaTransacao): Promise<Transacao> {
  return requisicao('POST', '/transacoes', { corpo: nova })
}

/** Edita uma transação (substitui todos os campos). */
export function atualizarTransacao(
  id: string,
  editada: TransacaoEditada,
): Promise<Transacao> {
  return requisicao('PUT', `/transacoes/${encodeURIComponent(id)}`, {
    corpo: editada,
  })
}

export function excluirTransacao(id: string): Promise<void> {
  return requisicao('DELETE', `/transacoes/${encodeURIComponent(id)}`)
}
