import type { TipoCategoria } from '../api/tipos.ts'

const formatoMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Formata um valor da API para mostrar: 52.9 vira "R$ 52,90"; -150.75 vira "-R$ 150,75". */
export function formatarMoeda(valor: number): string {
  return formatoMoeda.format(valor)
}

/**
 * Valor de uma transação com o sinal do tipo: despesa "− R$ 52,90", receita "+ R$ 3.000,00".
 * Na API o valor é sempre positivo; quem diz se entrou ou saiu é o tipo da categoria.
 */
export function formatarValorDaTransacao(
  valor: number,
  tipo: TipoCategoria,
): string {
  return `${tipo === 'RECEITA' ? '+' : '−'} ${formatarMoeda(valor)}`
}
