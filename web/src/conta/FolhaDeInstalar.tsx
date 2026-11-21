import { Share, SquarePlus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import folhas from '../categorias/Categorias.module.css'
import styles from './Conta.module.css'

type Props = {
  aoFechar: () => void
}

/**
 * Como instalar no iPhone e no iPad (#217). O Safari não tem o convite de instalar do Chrome: o
 * caminho é pelo botão Compartilhar, e o app explica em três passos.
 *
 * O mesmo `<dialog>` das outras folhas (#192). Ao sair, não chama `close()` (#215).
 */
export function FolhaDeInstalar({ aoFechar }: Props) {
  const folha = useRef<HTMLDialogElement>(null)
  const botao = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const quemAbriu = document.activeElement
    folha.current?.showModal()
    botao.current?.focus()
    return () => {
      if (quemAbriu instanceof HTMLElement) quemAbriu.focus()
    }
  }, [])

  return (
    <dialog
      ref={folha}
      className={folhas.folha}
      aria-labelledby="titulo-instalar"
      onClose={aoFechar}
    >
      <div className={styles.conteudoDeInstalar}>
        <div>
          <h2 id="titulo-instalar" className={folhas.tituloDaFolha}>
            Instalar no iPhone
          </h2>
          <p className={styles.texto}>Leva 10 segundos, pelo próprio Safari</p>
        </div>
        <ol className={styles.passos}>
          <li>
            <span>
              Toque em <strong>Compartilhar</strong>, na barra do Safari
            </span>
            <Share size={22} aria-hidden="true" />
          </li>
          <li>
            <span>
              Role a lista e toque em{' '}
              <strong>Adicionar à Tela de Início</strong>
            </span>
            <SquarePlus size={22} aria-hidden="true" />
          </li>
          <li>
            <span>
              Toque em <strong>Adicionar</strong>. O ícone do Easy Finance
              aparece junto dos seus apps
            </span>
          </li>
        </ol>
        <button
          ref={botao}
          type="button"
          className={folhas.botaoPrincipal}
          onClick={() => folha.current?.close()}
        >
          Entendi
        </button>
      </div>
    </dialog>
  )
}
