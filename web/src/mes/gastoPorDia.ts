import type { GastoDoDia } from '../api/tipos.ts'
import type { Mes } from '../formatacao/datas.ts'

/**
 * Média diária de gasto do mês (#189). Fica no app, e não na API, porque depende de "hoje" no
 * fuso de quem está usando:
 *
 * - mês passado: o total dividido por todos os dias do mês;
 * - mês atual: o total dividido pelos dias que já passaram (no dia 5, por 5, e não por 30);
 * - mês futuro: não há média (null).
 *
 * A conta é em centavos e arredonda no fim, como o resto do app faz com dinheiro.
 */
export function mediaDiaria(
  total: number,
  diasDoMes: number,
  mes: Mes,
  hoje: string,
): number | null {
  const mesDeHoje = hoje.slice(0, 7)
  if (mes > mesDeHoje) return null
  const dias = mes === mesDeHoje ? Number(hoje.slice(8)) : diasDoMes
  return Math.round((total * 100) / dias) / 100
}

/** O dia com mais gasto. No empate, o primeiro. Sem gasto nenhum, null. */
export function diaDeMaiorGasto(dias: GastoDoDia[]): GastoDoDia | null {
  let maior: GastoDoDia | null = null
  for (const dia of dias) {
    if (dia.total > 0 && (!maior || dia.total > maior.total)) maior = dia
  }
  return maior
}
