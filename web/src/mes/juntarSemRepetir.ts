import type { Transacao } from '../api/tipos.ts'

/**
 * Junta a próxima página no fim da lista, sem repetir transação.
 *
 * Por que pode repetir: a paginação é por número de página (ADR-0017). Se um lançamento novo
 * entrar no mês enquanto a pessoa rola a lista, tudo "escorrega" uma posição, e o último item
 * da página 1 volta como o primeiro da página 2. É raro, então o app só ignora o repetido.
 * Quem já está na lista fica onde está; o novo lançamento aparece ao abrir o mês de novo.
 */
export function juntarSemRepetir(
  lista: Transacao[],
  novas: Transacao[],
): Transacao[] {
  const jaNaLista = new Set(lista.map((transacao) => transacao.id))
  return [
    ...lista,
    ...novas.filter((transacao) => !jaNaLista.has(transacao.id)),
  ]
}
