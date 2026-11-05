import { Outlet } from 'react-router'
import { AvisoDeAtualizacao } from '../pwa/AvisoDeAtualizacao.tsx'
import styles from './Layout.module.css'
import { NavegacaoInferior } from './NavegacaoInferior.tsx'

/** Moldura de todas as telas: o conteúdo da tela atual em cima e a navegação embaixo. */
export function Layout() {
  return (
    <div className={styles.app}>
      <main className={styles.conteudo}>
        <Outlet />
      </main>
      <NavegacaoInferior />
      <AvisoDeAtualizacao />
    </div>
  )
}
