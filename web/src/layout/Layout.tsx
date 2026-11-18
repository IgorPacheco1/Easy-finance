import { useCallback, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Aviso } from '../componentes/Aviso.tsx'
import { AvisoDeAtualizacao } from '../pwa/AvisoDeAtualizacao.tsx'
import { useSessao } from '../sessao/useSessao.ts'
import styles from './Layout.module.css'
import { NavegacaoInferior } from './NavegacaoInferior.tsx'

/** Moldura de todas as telas: o conteúdo da tela atual em cima e a navegação embaixo. */
export function Layout() {
  const { descartados, dispensarAvisoDeDescarte } = useSessao()
  // Aviso que uma tela deixa para a próxima ao navegar (ex.: "Lançamento salvo." ao voltar da
  // edição, #101). Fica ligado à navegação (`key`): fechar não apaga o aviso de uma navegação nova.
  const local = useLocation()
  const avisoRecebido = (local.state as { aviso?: string } | null)?.aviso
  const [avisoFechadoEm, setAvisoFechadoEm] = useState<string | null>(null)
  const fecharAvisoRecebido = useCallback(
    () => setAvisoFechadoEm(local.key),
    [local.key],
  )

  return (
    <div className={styles.app}>
      <main className={styles.conteudo}>
        <Outlet />
      </main>
      <NavegacaoInferior />
      <AvisoDeAtualizacao />
      {avisoRecebido && avisoFechadoEm !== local.key && (
        <Aviso mensagem={avisoRecebido} aoFechar={fecharAvisoRecebido} />
      )}
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
