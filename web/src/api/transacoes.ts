import { requisicao } from './cliente.ts'
import type {
  NovaTransacao,
  PaginaDeTransacoes,
  Periodo,
  TipoCategoria,
  Transacao,
  TransacaoEditada,
} from './tipos.ts'

/**
 * Filtros da listagem (#93). Todos opcionais e combináveis. Sem `pagina` e `tamanho`, a API
 * devolve a página 1 com 20 itens.
 */
export type FiltroDeTransacoes = {
  periodo?: Periodo
  categoriaId?: string
  tipo?: TipoCategoria
  /** Texto contido na descrição, sem diferenciar maiúsculas. */
  descricao?: string
  /** Pontas incluídas. */
  valorMinimo?: number
  valorMaximo?: number
  /** Começa em 1. */
  pagina?: number
  /** De 1 a 100. */
  tamanho?: number
}

/**
 * Uma página das transações (da mais recente para a mais antiga) que atendem ao filtro. Para a
 * próxima página, peça `pagina + 1` enquanto `temMais` for true (ADR-0017).
 */
export function listarTransacoes(
  filtro: FiltroDeTransacoes = {},
): Promise<PaginaDeTransacoes> {
  const { periodo, valorMinimo, valorMaximo, pagina, tamanho } = filtro
  return requisicao('GET', '/transacoes', {
    parametros: {
      de: periodo?.de,
      ate: periodo?.ate,
      categoriaId: filtro.categoriaId,
      tipo: filtro.tipo,
      descricao: filtro.descricao,
      valorMinimo: valorMinimo?.toString(),
      valorMaximo: valorMaximo?.toString(),
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
export function criarTransacao(
  nova: NovaTransacao,
  opcoes: { tempoLimiteMs?: number } = {},
): Promise<Transacao> {
  return requisicao('POST', '/transacoes', { corpo: nova, ...opcoes })
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
