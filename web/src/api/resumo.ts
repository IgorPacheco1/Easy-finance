import { requisicao } from './cliente.ts'
import type { Periodo, Resumo } from './tipos.ts'

/**
 * Total, quantidade e percentual de cada categoria no período, com receitas e despesas
 * separadas (#95). Como o saldo, vem calculado pela API: o app não faz conta com dinheiro.
 */
export function buscarResumo(periodo: Periodo): Promise<Resumo> {
  return requisicao('GET', '/resumo', { parametros: periodo })
}
