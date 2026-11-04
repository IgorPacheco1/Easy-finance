import type { Transacao } from '../api/tipos.ts'

export type DiaDaLista = { data: string; transacoes: Transacao[] }

/**
 * Junta as transações do mesmo dia, mantendo a ordem em que a API mandou (da mais recente
 * para a mais antiga). Assim a lista mostra um título por dia e, embaixo, os lançamentos dele.
 */
export function agruparPorDia(transacoes: Transacao[]): DiaDaLista[] {
  const dias: DiaDaLista[] = []
  for (const transacao of transacoes) {
    const ultimo = dias.at(-1)
    if (ultimo && ultimo.data === transacao.data) {
      ultimo.transacoes.push(transacao)
    } else {
      dias.push({ data: transacao.data, transacoes: [transacao] })
    }
  }
  return dias
}
