import { Outlet } from 'react-router'
import { Aviso } from '../componentes/Aviso.tsx'
import { AvisoDeAtualizacao } from '../pwa/AvisoDeAtualizacao.tsx'
import { useSessao } from '../sessao/useSessao.ts'
import styles from './Layout.module.css'
import { NavegacaoInferior } from './NavegacaoInferior.tsx'

/** Moldura de todas as telas: o conteúdo da tela atual em cima e a navegação embaixo. */
export function Layout() {
  const { descartados, dispensarAvisoDeDescarte } = useSessao()

  return (
    <div className={styles.app}>
      <main className={styles.conteudo}>
        <Outlet />
      </main>
      <NavegacaoInferior />
      <AvisoDeAtualizacao />
      {descartados > 0 && (
        // Entrou outra conta neste aparelho: o que a conta anterior não chegou a enviar foi apagado.
        <Aviso
          mensagem={
            descartados === 1
              ? '1 lançamento não enviado da conta anterior foi descartado.'
              : `${descartados} lançamentos não enviados da conta anterior foram descartados.`
          }
          aoFechar={dispensarAvisoDeDescarte}
          duracao={10000}
        />
      )}
    </div>
  )
}
