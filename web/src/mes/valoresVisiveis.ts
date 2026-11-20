import { createContext, use } from 'react'

export type ValoresVisiveis = {
  visiveis: boolean
  alternar: () => void
}

/**
 * O "olho" do Mês (#188): quando fechado, todos os valores em reais da tela viram "R$ •••••".
 *
 * Um contexto deixa o cartão do saldo, o resumo e a lista lerem o mesmo estado sem passar uma
 * prop de componente em componente. Fora da tela do Mês (na Busca, por exemplo), ninguém fornece
 * o contexto e vale o padrão: valores visíveis.
 *
 * Por enquanto o estado vale enquanto o app está aberto; guardar no aparelho é da #195.
 */
export const ContextoDosValores = createContext<ValoresVisiveis>({
  visiveis: true,
  alternar: () => {},
})

export function useValoresVisiveis(): ValoresVisiveis {
  return use(ContextoDosValores)
}
