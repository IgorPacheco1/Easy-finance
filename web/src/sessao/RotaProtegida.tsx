import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { PedirNomePagina } from '../paginas/PedirNomePagina.tsx'
import styles from './Autenticacao.module.css'
import { useSessao } from './useSessao.ts'

/**
 * Deixa passar só quem está logado (ADR-0027). Enquanto o app pergunta ao servidor, mostra
 * "Carregando…"; sem sessão, leva para a tela de entrar; sem nome (#194), pede o nome antes.
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
  // Conta de antes do nome existir (#193): pede o nome uma vez. Só com a sessão confirmada,
  // porque salvar o nome fala com o servidor; sem conexão, o app abre normalmente.
  if (estado.confirmada && estado.usuario.nome === null) {
    return <PedirNomePagina />
  }
  return children
}
