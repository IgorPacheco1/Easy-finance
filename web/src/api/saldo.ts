import { requisicao } from './cliente.ts'
import type { Periodo, Saldo } from './tipos.ts'

/**
 * Receitas, despesas e saldo do período, calculados pela API.
 * O app nunca faz conta com dinheiro: o resultado já vem pronto, em decimal exato.
 */
export function buscarSaldo(periodo: Periodo): Promise<Saldo> {
  return requisicao('GET', '/saldo', { parametros: periodo })
}
