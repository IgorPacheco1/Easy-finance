/**
 * Os pedidos que um teste guardou, sem os repetidos (#223).
 *
 * Os testes de tela rodam dentro do `StrictMode`, como o app (`main.tsx`). Em desenvolvimento o
 * React monta, desmonta e monta de novo cada componente, então o efeito que busca os dados roda
 * duas vezes e o mesmo pedido sai em dobro (os hooks descartam a resposta antiga; em produção sai
 * uma vez só). O teste confere **o que** foi pedido (período, filtros, página), e não quantas
 * vezes. Onde a quantidade importa ("Tentar de novo" pede outra vez), o teste conta os pedidos
 * feitos depois da ação.
 */
export function semRepetidos<T>(pedidos: readonly T[]): T[] {
  return [...new Set(pedidos)]
}
