import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import styles from './Autenticacao.module.css'
import { useSessao } from './useSessao.ts'

/**
 * Deixa passar só quem está logado (ADR-0027). Enquanto o app pergunta ao servidor, mostra
 * "Carregando…"; sem sessão, leva para a tela de entrar.
 */
export function RotaProtegida({ children }: { children: ReactNode }) {
  const { estado } = useSessao()

  if (estado.situacao === 'carregando') {
    return (
      <p className={styles.carregando} role="status">
        Carregando…
      </p>
    )
  }
  if (estado.situacao === 'anonimo') {
    return <Navigate to="/entrar" replace />
  }
  return children
}
