/**
 * Datas como a API usa: texto "AAAA-MM-DD", sem hora e sem fuso.
 *
 * "Hoje" é calculado pelo relógio do celular, no fuso de quem usa. Não use
 * `new Date().toISOString()`: ele usa UTC, e às 22h no Brasil já seria o dia seguinte.
 */

function doisDigitos(numero: number): string {
  return String(numero).padStart(2, '0')
}

/** Data local do aparelho no formato da API. */
export function paraTextoDaApi(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

export function hoje(agora: Date = new Date()): string {
  return paraTextoDaApi(agora)
}

export function ontem(agora: Date = new Date()): string {
  return paraTextoDaApi(
    new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1),
  )
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

/**
 * Soma anos como o Java (LocalDate.plusYears), que é o que a API usa:
 * 29/02/2028 menos 1 ano vira 28/02/2027, e não 01/03/2027.
 */
export function somarAnos(data: string, anos: number): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  const novoAno = ano + anos
  const novoDia = Math.min(dia, diasNoMes(novoAno, mes))
  return `${novoAno}-${doisDigitos(mes)}-${doisDigitos(novoDia)}`
}

/** "2026-11-04" vira "04/11/2026". */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}
