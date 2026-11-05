import { useEffect } from 'react'
import styles from './Aviso.module.css'

export type DadosDoAviso = {
  mensagem: string
  /** Botão opcional no aviso (por exemplo, "Desfazer"). */
  acao?: { rotulo: string; aoClicar: () => void }
}

type Props = DadosDoAviso & {
  aoFechar: () => void
  /**
   * Quanto tempo o aviso fica na tela, em milissegundos. `null` deixa o aviso na tela até a
   * pessoa tocar na ação (usado no aviso de versão nova).
   */
  duracao?: number | null
}

/**
 * Aviso rápido que aparece no topo da tela e some sozinho (a menos que `duracao` seja `null`). `role="status"` faz o leitor de
 * tela anunciar a mensagem sem tirar o foco do que a pessoa está fazendo.
 */
export function Aviso({ mensagem, acao, aoFechar, duracao = 6000 }: Props) {
  useEffect(() => {
    if (duracao === null) {
      return
    }
    const temporizador = setTimeout(aoFechar, duracao)
    return () => clearTimeout(temporizador)
  }, [mensagem, aoFechar, duracao])

  return (
    <div className={styles.aviso} role="status">
      <span>{mensagem}</span>
      {acao && (
        <button type="button" className={styles.acao} onClick={acao.aoClicar}>
          {acao.rotulo}
        </button>
      )}
    </div>
  )
}
