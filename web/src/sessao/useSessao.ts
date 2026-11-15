import { useContext } from 'react'
import { ContextoDaSessao, type Sessao } from './contexto.ts'

/** A sessão do app: quem está logado e as ações de entrar, sair e criar conta (ADR-0027). */
export function useSessao(): Sessao {
  const sessao = useContext(ContextoDaSessao)
  if (!sessao) {
    throw new Error('useSessao precisa estar dentro de <SessaoProvider>.')
  }
  return sessao
}
