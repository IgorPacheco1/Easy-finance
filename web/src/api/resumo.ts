import { requisicao } from './cliente.ts'
import type { Periodo, Resumo, ResumoDiario } from './tipos.ts'

/**
 * Total, quantidade e percentual de cada categoria no período, com receitas e despesas
 * separadas (#95). Como o saldo, vem calculado pela API: o app não faz conta com dinheiro.
 */
export function buscarResumo(periodo: Periodo): Promise<Resumo> {
  return requisicao('GET', '/resumo', { parametros: periodo })
}

/**
 * Despesas de cada dia do período, para o gráfico de gasto por dia do Mês (#189). O período tem
 * no máximo 31 dias. A média diária fica com o app (mes/gastoPorDia.ts), que sabe que dia é hoje.
 */
export function buscarResumoDiario(periodo: Periodo): Promise<ResumoDiario> {
  return requisicao('GET', '/resumo/diario', { parametros: periodo })
}
