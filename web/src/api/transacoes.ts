import { requisicao } from './cliente.ts'
import type {
  NovaTransacao,
  Periodo,
  Transacao,
  TransacaoEditada,
} from './tipos.ts'

/** Lista as transações (da mais recente para a mais antiga); com `periodo`, só as do período. */
export function listarTransacoes(periodo?: Periodo): Promise<Transacao[]> {
  return requisicao('GET', '/transacoes', {
    parametros: { de: periodo?.de, ate: periodo?.ate },
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
