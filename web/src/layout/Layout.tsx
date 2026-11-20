import { useCallback, useRef, useState, type MouseEvent } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router'
import { Aviso } from '../componentes/Aviso.tsx'
import { AvisoDeAtualizacao } from '../pwa/AvisoDeAtualizacao.tsx'
import { useSessao } from '../sessao/useSessao.ts'
import styles from './Layout.module.css'
import { NavegacaoInferior } from './NavegacaoInferior.tsx'
import { NavegacaoLateral } from './NavegacaoLateral.tsx'
import { useTelaLarga } from './useTelaLarga.ts'

/**
 * Moldura de todas as telas: a navegação e o conteúdo da tela atual. No celular a navegação fica
 * embaixo; no computador (tela larga, #161), numa coluna à esquerda. As telas são as mesmas nos
 * dois: só a moldura e o CSS mudam.
 *
 * O primeiro Tab mostra o link "Pular para o conteúdo", para quem usa teclado não passar por
 * todos os links da navegação em cada tela.
 */
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

  const telaLarga = useTelaLarga()
  // Mês e Buscar aproveitam a largura do computador para a lista; as outras ficam na coluna normal.
  const noMes = useMatch('/mes')
  const naBusca = useMatch('/buscar')
  const conteudo = useRef<HTMLElement>(null)

  function pularParaOConteudo(evento: MouseEvent<HTMLAnchorElement>) {
    // O foco vai para o <main> sem mudar o endereço (o "#conteudo" fica só como alternativa).
    evento.preventDefault()
    conteudo.current?.focus()
  }

  const classesDaColuna = [
    styles.coluna,
    noMes && styles.colunaLarga,
    naBusca && styles.colunaMedia,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={telaLarga ? `${styles.app} ${styles.computador}` : styles.app}
    >
      <a href="#conteudo" className={styles.pular} onClick={pularParaOConteudo}>
        Pular para o conteúdo
      </a>
      {telaLarga && <NavegacaoLateral />}
      <main
        id="conteudo"
        ref={conteudo}
        tabIndex={-1}
        className={styles.conteudo}
      >
        <div className={classesDaColuna}>
          {/* key: trocar de tela recria o bloco e a entrada roda (#196). Só o caminho conta: no
              Mês, trocar de mês muda só o "?m=" e não anima. */}
          <div key={local.pathname} className={styles.entrada}>
            <Outlet />
          </div>
        </div>
      </main>
      {!telaLarga && <NavegacaoInferior />}
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
